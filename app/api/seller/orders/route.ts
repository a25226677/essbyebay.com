import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { makeOrderCode } from "../../../../lib/order-code";
import { sanitizeUuids, queryInBatches, type DbResult } from "@/lib/supabase/query-helpers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const context = await getSellerContext();
    if (context instanceof NextResponse) return context;

    const { userId } = context;
    const db = createAdminServiceClient();
    const { searchParams } = new URL(request.url);

    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const paymentFilter = (searchParams.get("payment_status") || "all").trim();
    const deliveryFilter = (searchParams.get("delivery_status") || "all").trim();

    // ── 1. Seller's product IDs ───────────────────────────────────────────────
    const { data: sellerProductsData, error: sellerProductsError } = await db
      .from("products")
      .select("id")
      .eq("seller_id", userId);

    if (sellerProductsError) {
      console.error("[seller/orders] step=seller_products", sellerProductsError);
      return NextResponse.json(
        { error: sellerProductsError.message, step: "seller_products" },
        { status: 500 },
      );
    }

    const sellerProductIds = sanitizeUuids(
      (sellerProductsData || []).map((p) => p.id),
    );

    // ── 2. Order-items for this seller (two strategies, run in parallel) ──────
    type OrderItemRow = {
      id: string;
      order_id: string;
      quantity: number;
      seller_id: string;
      product_id: string;
      line_total: number | null;
      storehouse_price: number | null;
    };

    type FrozeOrderRow = {
      order_id: string;
      amount: number | null;
      profit: number | null;
      payment_status: string | null;
      pickup_status: string | null;
    };

    const [strictRes, fallbackRes, frozeRes] = await Promise.all([
      // Direct: order_items where seller_id = userId
      db
        .from("order_items")
        .select("id, order_id, quantity, seller_id, product_id, line_total, storehouse_price")
        .eq("seller_id", userId),

      // Fallback: order_items for any product the seller currently owns.
      // Batched to avoid PostgREST URL-length 400 Bad Request on large stores.
      queryInBatches<OrderItemRow>(
        (chunk) =>
          db
            .from("order_items")
            .select("id, order_id, quantity, seller_id, product_id, line_total, storehouse_price")
            .in("product_id", chunk) as unknown as PromiseLike<DbResult<OrderItemRow>>,
        sellerProductIds,
      ),

      // Frozen orders — direct seller→order link independent of order_items
      db
        .from("froze_orders")
        .select("order_id, amount, profit, payment_status, pickup_status")
        .eq("seller_id", userId),
    ]);

    if (strictRes.error) {
      console.error("[seller/orders] step=order_items_strict", strictRes.error);
      return NextResponse.json(
        { error: strictRes.error.message, step: "order_items_strict" },
        { status: 500 },
      );
    }
    if (fallbackRes.error) {
      console.error("[seller/orders] step=order_items_fallback", fallbackRes.error);
      return NextResponse.json(
        { error: fallbackRes.error.message, step: "order_items_fallback" },
        { status: 500 },
      );
    }
    // froze_orders errors are non-fatal — log and continue
    if (frozeRes.error) {
      console.warn("[seller/orders] step=froze_orders (non-fatal)", frozeRes.error);
    }

    const rawItems = [...(strictRes.data || []), ...(fallbackRes.data || [])];
    const uniqueItems = Array.from(
      new Map(rawItems.map((r) => [r.id, r])).values(),
    );

    // ── 3. Resolve current product→seller mapping ─────────────────────────────
    const productIds = sanitizeUuids(
      [...new Set(uniqueItems.map((r) => r.product_id))],
    );

    type ProductSellerRow = { id: string; seller_id: string };
    const { data: productRows, error: productRowsError } = await queryInBatches<ProductSellerRow>(
      (chunk) =>
        db.from("products").select("id, seller_id").in("id", chunk) as unknown as PromiseLike<DbResult<ProductSellerRow>>,
      productIds,
    );

    if (productRowsError) {
      console.error("[seller/orders] step=product_sellers", productRowsError);
      return NextResponse.json(
        { error: productRowsError.message, step: "product_sellers" },
        { status: 500 },
      );
    }

    const productSellerMap = new Map(
      (productRows || []).map((r) => [r.id, r.seller_id]),
    );

    // ── 4. Build order → qty map ──────────────────────────────────────────────
    const orderCountMap: Record<string, number> = {};
    const orderAmountMap: Record<string, number> = {};
    const orderProfitMap: Record<string, number> = {};
    for (const row of uniqueItems) {
      if (row.seller_id !== userId && productSellerMap.get(row.product_id) !== userId) continue;
      const quantity = Number(row.quantity ?? 1) || 1;
      const lineTotal = Number(row.line_total || 0);
      const storehouseUnit = Number(row.storehouse_price || 0);
      const storehouseTotal = storehouseUnit * quantity;

      orderCountMap[row.order_id] =
        (orderCountMap[row.order_id] || 0) + quantity;
      orderAmountMap[row.order_id] =
        (orderAmountMap[row.order_id] || 0) + lineTotal;
      orderProfitMap[row.order_id] =
        (orderProfitMap[row.order_id] || 0) + (lineTotal - storehouseTotal);
    }

    // Include frozen orders (may have no order_items — e.g. seeded data)
    const frozeMap = new Map<string, FrozeOrderRow>();
    for (const r of (frozeRes.data || []) as FrozeOrderRow[]) {
      if (r.order_id && !(r.order_id in orderCountMap)) {
        orderCountMap[r.order_id] = 0;
      }
      if (r.order_id) frozeMap.set(r.order_id, r);
    }

    // ── 5. Fetch matching orders ───────────────────────────────────────────────
    const orderIds = sanitizeUuids(Object.keys(orderCountMap));

    if (orderIds.length === 0) {
      return NextResponse.json({
        items: [],
        stats: { totalOrders: 0, totalTurnover: 0, totalProfit: 0 },
      });
    }

    const deliveryDisplayToDb: Record<string, string> = {
      Pending: "pending",
      Confirmed: "confirmed",
      "Picked Up": "picked_up",
      "On Delivery": "on_the_way",
      Delivered: "delivered",
      Cancelled: "cancelled",
    };

    const dbDeliveryValue = deliveryFilter !== "all" ? deliveryDisplayToDb[deliveryFilter] : null;

    type OrderRow = {
      id: string;
      order_code: string | null;
      status: string;
      payment_status: string;
      delivery_status: string;
      pickup_status: string;
      total_amount: number;
      created_at: string;
      user_id: string;
    };
    const { data: orders, error: ordersError } = await queryInBatches<OrderRow>(
      (chunk) => {
        let q = db
          .from("orders")
          .select("id,order_code,status,payment_status,delivery_status,pickup_status,total_amount,created_at,user_id")
          .in("id", chunk)
          .order("created_at", { ascending: false });
        if (dbDeliveryValue) q = q.eq("delivery_status", dbDeliveryValue);
        return q as unknown as PromiseLike<DbResult<OrderRow>>;
      },
      orderIds,
    );

    // Re-sort after merging batches (each batch is individually sorted)
    (orders as OrderRow[]).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    if (ordersError) {
      console.error("[seller/orders] step=orders_fetch", ordersError);
      return NextResponse.json(
        { error: ordersError.message, step: "orders_fetch" },
        { status: 500 },
      );
    }

    // ── 6. Fetch customer names ───────────────────────────────────────────────
    const userIds = sanitizeUuids(
      [...new Set((orders || []).map((o) => o.user_id))],
    );

    type ProfileRow = { id: string; full_name: string | null };
    const { data: users, error: usersError } = await queryInBatches<ProfileRow>(
      (chunk) =>
        db.from("profiles").select("id,full_name").in("id", chunk) as unknown as PromiseLike<DbResult<ProfileRow>>,
      userIds,
    );

    if (usersError) {
      console.error("[seller/orders] step=users_fetch", usersError);
      return NextResponse.json(
        { error: usersError.message, step: "users_fetch" },
        { status: 500 },
      );
    }

    const userMap = new Map(
      (users || []).map((u) => [u.id, u.full_name || "Customer"]),
    );

    // ── 7. Shape response ─────────────────────────────────────────────────────
    const deliveryStatusDisplay: Record<string, string> = {
      delivered: "Delivered",
      on_the_way: "On Delivery",
      picked_up: "Picked Up",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      pending: "Pending",
    };

    const mapped = (orders || []).map((order) => {
      const code = makeOrderCode(order.created_at, order.order_code);
      const frozeOrder = frozeMap.get(order.id);
      const itemAmount = Number((orderAmountMap[order.id] || 0).toFixed(2));
      const itemProfit = Number((orderProfitMap[order.id] || 0).toFixed(2));
      const fallbackAmount = Number(
        ((Number(frozeOrder?.amount || 0) || 0) + (Number(frozeOrder?.profit || 0) || 0)).toFixed(2),
      );
      const amount = itemAmount > 0 ? itemAmount : fallbackAmount;
      const profit = itemAmount > 0 ? itemProfit : Number((Number(frozeOrder?.profit || 0) || 0).toFixed(2));
      const pickupStatus =
        order.pickup_status === "picked_up" ||
        frozeOrder?.pickup_status === "picked_up" ||
        frozeOrder?.payment_status === "paid"
          ? "Picked Up"
          : "Unpicked Up";

      return {
        id: order.id,
        code,
        num_products: orderCountMap[order.id] || 0,
        customer: userMap.get(order.user_id) || "Customer",
        amount,
        profit,
        pickupStatus,
        deliveryStatus: deliveryStatusDisplay[order.delivery_status] ?? "Pending",
        paymentStatus:
          order.payment_status === "succeeded" || order.payment_status === "paid"
            ? "Paid"
            : "Un-Paid",
        date: order.created_at.slice(0, 10),
      };
    });

    const afterPaymentFilter =
      paymentFilter === "all"
        ? mapped
        : mapped.filter((o) =>
            paymentFilter === "Paid"
              ? o.paymentStatus === "Paid"
              : o.paymentStatus !== "Paid",
          );

    const filtered =
      search.length > 0
        ? afterPaymentFilter.filter((item) =>
            item.code.toLowerCase().includes(search),
          )
        : afterPaymentFilter;

    return NextResponse.json({
      items: filtered,
      stats: {
        totalOrders: filtered.length,
        totalTurnover: Number(
          filtered.reduce((s, o) => s + o.amount, 0).toFixed(2),
        ),
        totalProfit: Number(
          filtered.reduce((s, o) => s + o.profit, 0).toFixed(2),
        ),
      },
    });
  } catch (err) {
    console.error("[seller/orders] unhandled exception", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Internal server error",
        step: "unhandled",
      },
      { status: 500 },
    );
  }
}
