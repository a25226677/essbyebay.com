import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { searchParams } = new URL(request.url);

  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const status = (searchParams.get("status") || "all").trim();

  const itemsQuery = supabase
    .from("order_items")
    .select("order_id")
    .eq("seller_id", userId);

  const { data: sellerOrderRows, error: sellerRowsError } = await itemsQuery;

  if (sellerRowsError) {
    return NextResponse.json({ error: sellerRowsError.message }, { status: 500 });
  }

  const orderIds = [...new Set((sellerOrderRows || []).map((row) => row.order_id))];
  if (orderIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  let ordersQuery = supabase
    .from("orders")
    .select("id,status,payment_status,total_amount,created_at,user_id")
    .in("id", orderIds)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    const mapped =
      status === "On delivery"
        ? "shipped"
        : status.toLowerCase();
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
    const deliveryStatus =
      order.status === "shipped"
        ? "On delivery"
        : order.status.charAt(0).toUpperCase() + order.status.slice(1);

    const paymentStatus =
      order.payment_status === "succeeded"
        ? "Paid"
        : order.payment_status === "failed"
          ? "Unpaid"
          : order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1);

    return {
      id: order.id,
      code: order.id.slice(0, 8).toUpperCase(),
      customer: userMap.get(order.user_id) || "Customer",
      amount: Number(order.total_amount || 0),
      deliveryStatus,
      paymentStatus,
      date: new Date(order.created_at).toISOString().slice(0, 10),
    };
  });

  const filtered =
    search.length > 0
      ? mapped.filter((item) => item.code.toLowerCase().includes(search))
      : mapped;

  return NextResponse.json({ items: filtered });
}
