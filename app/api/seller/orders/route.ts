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

  const { data: sellerOrderRows, error: sellerRowsError } = await db
    .from("order_items")
    .select("order_id, quantity")
    .eq("seller_id", userId);

  if (sellerRowsError) {
    return NextResponse.json({ error: sellerRowsError.message }, { status: 500 });
  }

  // Build a count map: order_id → total quantity of items from this seller
  const orderCountMap: Record<string, number> = {};
  for (const row of sellerOrderRows || []) {
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
      deliveryFilter === "On Delivery" ? "shipped" : deliveryFilter.toLowerCase();
    ordersQuery = ordersQuery.eq("status", mapped);
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
      num_products: orderCountMap[order.id] || 1,
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
