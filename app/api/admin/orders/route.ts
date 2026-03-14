import { getAdminContext } from "@/lib/supabase/admin-api";
import { makeOrderCode } from "../../../../lib/order-code";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const search          = (sp.get("search") || "").trim();
  const delivery_status = sp.get("delivery_status") || "";
  const payment_status  = sp.get("payment_status") || "";
  const seller_id       = sp.get("seller_id") || "";
  const order_type      = sp.get("order_type") || ""; // "seller" | "inhouse"
  const dateFrom        = sp.get("from") || "";
  const dateTo          = sp.get("to") || "";
  const page   = Math.max(1, parseInt(sp.get("page")  || "1",  10));
  const limit  = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  // Single query: orders + inline order_items → products → shops
  // Use simple relation names (no explicit FK hints) to avoid FK-name mismatches
  // across different Supabase instances / migration histories.
  let query = db
    .from("orders")
    .select(
      `id, status, payment_status, payment_method,
       delivery_status, pickup_status, tracking_code,
       subtotal, shipping_fee, discount_amount, total_amount,
       created_at, updated_at, notes,
       profiles(id, full_name, phone),
       order_items(
         id, quantity, seller_id, product_id, line_total, storehouse_price,
         products(
           id, shop_id,
           shops(id, name)
         )
       )`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (delivery_status) query = query.eq("delivery_status", delivery_status);
  if (payment_status)  query = query.eq("payment_status", payment_status);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo)   query = query.lte("created_at", dateTo + "T23:59:59Z");

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items = (data || []) as any[];

  // Search by generated order code or customer name
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((o) => {
      const code = makeOrderCode(o.created_at as string).toLowerCase();
      const cust = ((o.profiles as { full_name?: string } | null)?.full_name || "").toLowerCase();
      return code.includes(q) || cust.includes(q);
    });
  }

  // Filter by seller_id / order_type using inline order_items data
  if (seller_id) {
    items = items.filter((o) =>
      Array.isArray(o.order_items) &&
      (o.order_items as { seller_id: string }[]).some((i) => i.seller_id === seller_id),
    );
  }
  if (order_type === "seller") {
    items = items.filter((o) =>
      Array.isArray(o.order_items) && o.order_items.length > 0,
    );
  }

  const orderIds = items.map((o) => o.id as string).filter(Boolean);
  const frozeByOrder = new Map<string, { profit: number; hasPickedUp: boolean }>();

  if (orderIds.length > 0) {
    const { data: frozeOrders, error: frozeError } = await db
      .from("froze_orders")
      .select("order_id, profit, payment_status, pickup_status")
      .in("order_id", orderIds);

    if (frozeError) {
      return NextResponse.json({ error: frozeError.message }, { status: 500 });
    }

    for (const row of frozeOrders || []) {
      const orderId = row.order_id as string;
      const current = frozeByOrder.get(orderId) || { profit: 0, hasPickedUp: false };
      frozeByOrder.set(orderId, {
        profit: Number((current.profit + Number(row.profit || 0)).toFixed(2)),
        hasPickedUp:
          current.hasPickedUp || row.pickup_status === "picked_up" || row.payment_status === "paid",
      });
    }
  }

  // Enrich items with computed fields
  const enriched = items.map((o) => {
    const oi: {
      quantity: number;
      seller_id: string;
      line_total?: number | null;
      storehouse_price?: number | null;
      products?: { shop_id?: string; shops?: { name?: string } };
    }[] =
      Array.isArray(o.order_items) ? o.order_items : [];

    // Number of distinct line-items in the order
    const numProducts = oi.length;

    // Shop name from first item's product → shop join
    const firstItem  = oi[0];
    const shopName   = firstItem?.products?.shops?.name ?? null;
    const froze = frozeByOrder.get(o.id as string);
    const itemProfit = Number(
      oi
        .reduce((sum, item) => {
          const quantity = Number(item.quantity || 0);
          const lineTotal = Number(item.line_total || 0);
          const storehouseTotal = Number(item.storehouse_price || 0) * quantity;
          return sum + (lineTotal - storehouseTotal);
        }, 0)
        .toFixed(2),
    );
    const profit = froze ? froze.profit : itemProfit;
    const pickupStatus =
      o.pickup_status === "picked_up" || froze?.hasPickedUp ? "picked_up" : (o.pickup_status || "unpicked_up");

    // Strip nested order_items from response (not needed by the table UI)
    const { order_items: _oi, ...rest } = o;
    void _oi;

    return {
      ...rest,
      order_code: makeOrderCode(o.created_at as string),
      shop_name: shopName,
      num_products: numProducts,
      payment_status: o.payment_status || "pending",
      pickup_status: pickupStatus,
      profit,
    };
  });

  return NextResponse.json({
    items: enriched,
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}
