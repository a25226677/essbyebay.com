import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const [
    { data: allOrders },
    { data: topProducts },
    { data: sellers },
  ] = await Promise.all([
    db.from("orders").select("id, total_amount, subtotal, discount_amount, status, created_at"),
    db
      .from("products")
      .select("id, title, price, review_count, rating, stock_count, shops(name), categories(name)")
      .order("review_count", { ascending: false })
      .limit(10),
    db
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "seller")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Monthly revenue for last 12 months
  const monthlyMap: Record<string, { revenue: number; orders: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = {
      revenue: 0,
      orders: 0,
    };
  }

  const paid = (allOrders || []).filter(
    (o) => o.status !== "cancelled" && o.status !== "refunded",
  );

  paid.forEach((o) => {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthlyMap) {
      monthlyMap[key].revenue += Number(o.total_amount || 0);
      monthlyMap[key].orders += 1;
    }
  });

  const monthlyRevenue = Object.entries(monthlyMap).map(([month, v]) => ({
    month,
    revenue: v.revenue,
    orders: v.orders,
  }));

  // Order status breakdown
  const statusBreakdown: Record<string, number> = {};
  (allOrders || []).forEach((o) => {
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
  });

  // Totals
  const totalRevenue = paid.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const totalOrders = (allOrders || []).length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalDiscount = (allOrders || []).reduce(
    (s, o) => s + Number(o.discount_amount || 0),
    0,
  );

  return NextResponse.json({
    summary: { totalRevenue, totalOrders, avgOrderValue, totalDiscount },
    monthlyRevenue,
    statusBreakdown,
    topProducts: topProducts || [],
    newSellers: sellers || [],
  });
}
