import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { userId } = context;
  // Use admin client to bypass RLS — seller can only see their own items (filtered by userId)
  const db = createAdminServiceClient();
  const { searchParams } = new URL(request.url);

  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const paymentFilter = (searchParams.get("payment_status") || "all").trim();
  const deliveryFilter = (searchParams.get("delivery_status") || "all").trim();

  const { data: sellerProducts } = await db
    .from("products")
    .select("id")
    .eq("seller_id", userId);

  const sellerProductIds = (sellerProducts || []).map((p) => p.id);

  const [strictSellerRowsRes, fallbackSellerRowsRes] = await Promise.all([
    db
      .from("order_items")
      .select("id, order_id, quantity, seller_id, product_id")
      .eq("seller_id", userId),
    sellerProductIds.length > 0
      ? db
          .from("order_items")
          .select("id, order_id, quantity, seller_id, product_id")
          .in("product_id", sellerProductIds)
      : Promise.resolve({ data: [] as { id: string; order_id: string; quantity: number; seller_id: string; product_id: string }[], error: null }),
  ]);

  const sellerRowsError = strictSellerRowsRes.error || fallbackSellerRowsRes.error;
  const rawOrderItems = [
    ...(strictSellerRowsRes.data || []),
    ...(fallbackSellerRowsRes.data || []),
  ];
  const uniqueOrderItems = Array.from(new Map(rawOrderItems.map((row) => [row.id, row])).values());

  if (sellerRowsError) {
    return NextResponse.json({ error: sellerRowsError.message }, { status: 500 });
  }

  // Resolve product sellers so legacy rows (wrong/missing seller_id) can still be attributed correctly.
  const productIds = [...new Set(uniqueOrderItems.map((row) => row.product_id).filter(Boolean))];
  const { data: productRows } = productIds.length
    ? await db.from("products").select("id, seller_id").in("id", productIds)
    : { data: [] as { id: string; seller_id: string }[] };

  const productSellerMap = new Map((productRows || []).map((row) => [row.id, row.seller_id]));

  // Build a count map: order_id → total quantity of items that belong to this seller
  const orderCountMap: Record<string, number> = {};
  for (const row of uniqueOrderItems) {
    const itemSellerId = row.seller_id || productSellerMap.get(row.product_id);
    if (itemSellerId !== userId) continue;
    orderCountMap[row.order_id] = (orderCountMap[row.order_id] || 0) + (row.quantity ?? 1);
  }
  const orderIds = Object.keys(orderCountMap);

  if (orderIds.length === 0) {
    return NextResponse.json({
      items: [],
      stats: { totalOrders: 0, totalTurnover: 0, totalProfit: 0 },
    });
  }

  let ordersQuery = db
    .from("orders")
    .select("id,status,payment_status,delivery_status,pickup_status,total_amount,created_at,user_id")
    .in("id", orderIds)
    .order("created_at", { ascending: false });

  if (deliveryFilter !== "all") {
    const mapped =
      deliveryFilter === "On Delivery"
        ? "on_the_way"
        : deliveryFilter === "Delivered"
          ? "delivered"
          : "pending";
    ordersQuery = ordersQuery.eq("delivery_status", mapped);
  }

  const { data: orders, error: ordersError } = await ordersQuery;

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  const userIds = [...new Set((orders || []).map((order) => order.user_id))];
  const { data: users } = await db
    .from("profiles")
    .select("id,full_name")
    .in("id", userIds);

  const userMap = new Map((users || []).map((user) => [user.id, user.full_name || "Customer"]));

  const mapped = (orders || []).map((order) => {
    // Format code as YYYYMMDD-XXXXXXXX
    const dateStr = order.created_at.slice(0, 10).replace(/-/g, "");
    const numericPart = (parseInt(order.id.replace(/-/g, "").slice(-10), 16) % 100000000)
      .toString()
      .padStart(8, "0");
    const code = `${dateStr}-${numericPart}`;

    const pickupStatus =
      order.pickup_status === "picked_up" ? "Picked Up" : "Unpicked Up";

    const deliveryStatus =
      order.delivery_status === "delivered"
        ? "Delivered"
        : order.delivery_status === "shipped"
          ? "On Delivery"
          : "Pending";

    const paymentStatus =
      order.payment_status === "succeeded" || order.payment_status === "paid"
        ? "Paid"
        : "Un-Paid";

    const amount = Number(order.total_amount || 0);
    // Deterministic profit: 15–20% of amount based on order ID hash
    const rateOffset = (parseInt(order.id.replace(/-/g, "").slice(-4), 16) % 100) / 100;
    const profit = Number((amount * (0.15 + rateOffset * 0.05)).toFixed(2));

    return {
      id: order.id,
      code,
      num_products: orderCountMap[order.id] || 0,
      customer: userMap.get(order.user_id) || "Customer",
      amount,
      profit,
      pickupStatus,
      deliveryStatus,
      paymentStatus,
      date: order.created_at.slice(0, 10),
    };
  });

  // Apply payment status filter in JS (avoids complex Supabase query composition)
  const afterPaymentFilter =
    paymentFilter === "all"
      ? mapped
      : mapped.filter((o) =>
          paymentFilter === "Paid" ? o.paymentStatus === "Paid" : o.paymentStatus !== "Paid"
        );

  const filtered =
    search.length > 0
      ? afterPaymentFilter.filter((item) => item.code.toLowerCase().includes(search))
      : afterPaymentFilter;

  const stats = {
    totalOrders: filtered.length,
    totalTurnover: Number(filtered.reduce((s, o) => s + o.amount, 0).toFixed(2)),
    totalProfit: Number(filtered.reduce((s, o) => s + o.profit, 0).toFixed(2)),
  };

  return NextResponse.json({ items: filtered, stats });
}
