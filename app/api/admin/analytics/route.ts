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
    { count: categoriesCount },
    { count: brandsCount },
    { data: allOrders },
    { data: recentOrders },
    { data: topProducts },
    { data: categoryStats },
    { data: productStockData },
    { data: sellerApprovalData },
    { data: adminProductsData },
    { data: orderItemsData },
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "seller"),
    db.from("shops").select("id", { count: "exact", head: true }),
    db.from("products").select("id", { count: "exact", head: true }),
    db.from("orders").select("id", { count: "exact", head: true }),
    db.from("categories").select("id", { count: "exact", head: true }),
    db.from("brands").select("id", { count: "exact", head: true }),
    // All orders for revenue & monthly trend calculation
    db.from("orders").select("total_amount,status,created_at"),
    // Recent 10 orders with customer name
    db
      .from("orders")
      .select(`id,total_amount,status,payment_status,created_at,
               profiles!orders_user_id_fkey(full_name)`)
      .order("created_at", { ascending: false })
      .limit(10),
    // Top 12 products by review_count
    db
      .from("products")
      .select("id,title,slug,price,image_url,review_count,rating,is_active,shops(name)")
      .eq("is_active", true)
      .order("review_count", { ascending: false })
      .limit(12),
    // Category distribution — just product counts (no 3-level nesting)
    db.from("categories").select("id,name,products(id)"),
    // Product stock per category for stock chart
    db.from("products").select("category_id,stock_count").eq("is_active", true),
    // Seller approval breakdown via shops
    db.from("shops").select("id,is_verified"),
    // Admin vs seller products
    db.from("products").select("id,shop_id").eq("is_active", true),
    // Order items joined to products for sales-per-category
    db.from("order_items").select("id,product_id,products(category_id)"),
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

  // Category product counts and sales per category
  // Build sale counts from flat order_items query
  const saleByCategoryId: Record<string, number> = {};
  (orderItemsData || []).forEach((item: { id: string; product_id: string | null; products: unknown }) => {
    const prod = item.products as { category_id: string | null } | null;
    const catId = prod?.category_id;
    if (catId) {
      saleByCategoryId[catId] = (saleByCategoryId[catId] || 0) + 1;
    }
  });

  const categoryDistribution = (categoryStats || [])
    .map((c: { id: string; name: string; products: unknown[] | null }) => {
      const count = Array.isArray(c.products) ? c.products.length : 0;
      const saleCount = saleByCategoryId[c.id] || 0;
      return { id: c.id, name: c.name, count, saleCount };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Category-wise stock (sum of stock per category)
  const stockMap: Record<string, number> = {};
  (productStockData || []).forEach((p: { category_id: string | null; stock_count: number | null }) => {
    if (p.category_id) {
      stockMap[p.category_id] = (stockMap[p.category_id] || 0) + Number(p.stock_count || 0);
    }
  });
  const categoryStockDistribution = categoryDistribution.map((c) => ({
    id: c.id,
    name: c.name,
    stock: stockMap[c.id] || 0,
  }));

  // Seller approval breakdown
  const approvedSellers = (sellerApprovalData || []).filter(
    (s: { id: string; is_verified: boolean | null }) => s.is_verified === true,
  ).length;
  const pendingSellers = (sellerApprovalData || []).filter(
    (s: { id: string; is_verified: boolean | null }) => s.is_verified !== true,
  ).length;

  // Admin vs seller products — use shop_id presence as indicator
  const sellerProducts = (adminProductsData || []).filter(
    (p: { id: string; shop_id: string | null }) => p.shop_id !== null,
  ).length;
  const adminProductsCount = (adminProductsData || []).filter(
    (p: { id: string; shop_id: string | null }) => p.shop_id === null,
  ).length;
  const publishedProducts = (productsCount || 0);

  return NextResponse.json({
    metrics: {
      customers: usersCount || 0,
      sellers: sellersCount || 0,
      shops: shopsCount || 0,
      products: productsCount || 0,
      orders: ordersCount || 0,
      totalRevenue,
      totalCategories: categoriesCount || 0,
      totalBrands: brandsCount || 0,
    },
    monthlyRevenue,
    ordersByStatus,
    categoryDistribution,
    categoryStockDistribution,
    productBreakdown: {
      published: publishedProducts,
      sellerProducts,
      adminProducts: adminProductsCount,
    },
    sellerBreakdown: {
      total: sellersCount || 0,
      approved: approvedSellers,
      pending: pendingSellers,
    },
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
      slug: p.slug,
      price: p.price,
      image_url: p.image_url,
      review_count: p.review_count,
      rating: p.rating,
      shop: (p.shops as unknown as { name: string } | null)?.name ?? "—",
    })),
  });
}
