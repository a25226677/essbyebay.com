import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  // ── Parallel queries ─────────────────────────────────────────────────────
  const [
    { count: usersCount },
    { count: sellersCount },
    { count: shopsCount },
    { count: productsCount },
    { count: ordersCount },
    { data: allOrders },
    { data: recentOrders },
    { data: topProducts },
    { data: categoryStats },
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "seller"),
    db.from("shops").select("id", { count: "exact", head: true }),
    db.from("products").select("id", { count: "exact", head: true }),
    db.from("orders").select("id", { count: "exact", head: true }),
    // All orders for revenue & monthly trend calculation
    db.from("orders").select("total_amount,status,created_at"),
    // Recent 10 orders with customer name
    db
      .from("orders")
      .select(`id,total_amount,status,payment_status,created_at,
               profiles!orders_user_id_fkey(full_name)`)
      .order("created_at", { ascending: false })
      .limit(10),
    // Top 5 products by review_count (proxy for sales)
    db
      .from("products")
      .select("id,title,price,image_url,review_count,rating,is_active,shops(name)")
      .eq("is_active", true)
      .order("review_count", { ascending: false })
      .limit(5),
    // Category distribution
    db.from("categories").select("id,name,products(id)"),
  ]);

  // ── Revenue calculations ──────────────────────────────────────────────────
  const paid = (allOrders || []).filter(
    (o) => o.status !== "cancelled" && o.status !== "refunded",
  );
  const totalRevenue = paid.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  // Monthly trend: last 6 months
  const monthlyMap: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
  }
  paid.forEach((o) => {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key in monthlyMap) monthlyMap[key] += Number(o.total_amount || 0);
  });
  const monthlyRevenue = Object.entries(monthlyMap).map(([month, revenue]) => ({
    month,
    revenue,
  }));

  // Order status counts
  const ordersByStatus: Record<string, number> = {};
  (allOrders || []).forEach((o) => {
    ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
  });

  // Category product counts
  const categoryDistribution = (categoryStats || [])
    .map((c: { id: string; name: string; products: unknown[] | null }) => ({
      id: c.id,
      name: c.name,
      count: Array.isArray(c.products) ? c.products.length : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return NextResponse.json({
    metrics: {
      customers: usersCount || 0,
      sellers: sellersCount || 0,
      shops: shopsCount || 0,
      products: productsCount || 0,
      orders: ordersCount || 0,
      totalRevenue,
    },
    monthlyRevenue,
    ordersByStatus,
    categoryDistribution,
    recentOrders: (recentOrders || []).map((o) => ({
      id: o.id,
      customer: (o.profiles as unknown as { full_name: string } | null)?.full_name ?? "—",
      total_amount: o.total_amount,
      status: o.status,
      payment_status: o.payment_status,
      created_at: o.created_at,
    })),
    topProducts: (topProducts || []).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      image_url: p.image_url,
      review_count: p.review_count,
      rating: p.rating,
      shop: (p.shops as unknown as { name: string } | null)?.name ?? "—",
    })),
  });
}
