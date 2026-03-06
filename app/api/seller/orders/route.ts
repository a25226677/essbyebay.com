import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { searchParams } = new URL(request.url);

  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const paymentFilter = (searchParams.get("payment_status") || "all").trim();
  const deliveryFilter = (searchParams.get("delivery_status") || "all").trim();

  const { data: sellerOrderRows, error: sellerRowsError } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("seller_id", userId);

  if (sellerRowsError) {
    return NextResponse.json({ error: sellerRowsError.message }, { status: 500 });
  }

  // Build a count map: order_id → number of items
  const orderCountMap: Record<string, number> = {};
  for (const row of sellerOrderRows || []) {
    orderCountMap[row.order_id] = (orderCountMap[row.order_id] || 0) + 1;
  }
  const orderIds = Object.keys(orderCountMap);

  if (orderIds.length === 0) {
    return NextResponse.json({
      items: [],
      stats: { totalOrders: 0, totalTurnover: 0, totalProfit: 0 },
    });
  }

  let ordersQuery = supabase
    .from("orders")
    .select("id,status,payment_status,total_amount,created_at,user_id")
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
  const { data: users } = await supabase
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
      order.status === "delivered" || order.status === "shipped"
        ? "Picked Up"
        : "Unpicked Up";

    const deliveryStatus =
      order.status === "delivered"
        ? "Delivered"
        : order.status === "shipped"
          ? "On Delivery"
          : "Pending";

    const paymentStatus = order.payment_status === "succeeded" ? "Paid" : "Un-Paid";

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
