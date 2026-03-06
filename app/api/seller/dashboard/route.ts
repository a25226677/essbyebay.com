import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  // Run independent queries in parallel
  const [
    productsCountResult,
    orderItemsResult,
    topProductsResult,
    categoryCountResult,
    payoutsResult,
    withdrawalsResult,
    monthlySalesResult,
    shopResult,
  ] = await Promise.all([
    // Product count
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId),

    // All order items for this seller (to derive order IDs and total sales)
    supabase
      .from("order_items")
      .select("order_id,line_total")
      .eq("seller_id", userId),

    // Top 12 products by rating
    supabase
      .from("products")
      .select("id,title,price,image_url,rating,review_count")
      .eq("seller_id", userId)
      .eq("is_active", true)
      .order("rating", { ascending: false })
      .limit(12),

    // Category breakdown: select category name via join
    supabase
      .from("products")
      .select("category_id,categories(name)")
      .eq("seller_id", userId),

    // Total payouts
    supabase
      .from("seller_payouts")
      .select("net_amount")
      .eq("seller_id", userId),

    // Withdrawals (to compute available balance)
    supabase
      .from("withdrawals")
      .select("amount,status")
      .eq("seller_id", userId),

    // Monthly sales (joined with orders created_at)
    supabase
      .from("order_items")
      .select("line_total,orders(created_at)")
      .eq("seller_id", userId),

    // Shop info
    supabase
      .from("shops")
      .select("id,name,is_verified,product_count,logo_url,rating")
      .eq("owner_id", userId)
      .maybeSingle(),

  ]);

  const productCount = productsCountResult.count ?? 0;
  const shop = shopResult.data;

  // Get seller views from profile
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("seller_views")
    .eq("id", userId)
    .maybeSingle();
  const sellerViews = sellerProfile?.seller_views ?? 0;
  const shopRating = Number(shop?.rating ?? 0);

  // Available balance: earned payouts minus completed withdrawals
  const totalPayouts = (payoutsResult.data ?? []).reduce(
    (s, p) => s + Number(p.net_amount),
    0,
  );
  const totalWithdrawn = (withdrawalsResult.data ?? [])
    .filter((w) => w.status === "completed" || w.status === "approved")
    .reduce((s, w) => s + Number(w.amount), 0);
  const balance = Math.max(0, totalPayouts - totalWithdrawn);

  // Unique order IDs
  const orderItemRows = orderItemsResult.data ?? [];
  const orderIds = [...new Set(orderItemRows.map((r) => r.order_id))];

  // Fetch order statuses
  const ordersResult =
    orderIds.length > 0
      ? await supabase.from("orders").select("id,status").in("id", orderIds)
      : { data: [] as { id: string; status: string }[] };

  const orders = ordersResult.data ?? [];
  const orderBreakdown = {
    newOrder: orders.filter((o) => o.status === "pending" || o.status === "processing").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    onDelivery: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  // Total sales
  const totalSales = orderItemRows.reduce((s, r) => s + Number(r.line_total), 0);

  // Category breakdown
  const catMap: Record<string, { name: string; count: number }> = {};
  for (const product of categoryCountResult.data ?? []) {
    const catId = (product.category_id as string) || "__none__";
    const catName = (product.categories as unknown as { name: string }[] | null)?.[0]?.name ?? "Uncategorized";
    if (!catMap[catId]) catMap[catId] = { name: catName, count: 0 };
    catMap[catId].count++;
  }
  const categoryProducts = Object.values(catMap)
    .sort((a, b) => b.count - a.count)
    .map((c) => ({ name: c.name, count: c.count }));

  // Monthly sales — last 6 months
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(d.toLocaleString("default", { month: "short" }));
  }
  const monthMap: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));

  for (const item of monthlySalesResult.data ?? []) {
    const createdAt = (item.orders as unknown as { created_at: string }[] | null)?.[0]?.created_at;
    if (!createdAt) continue;
    const key = new Date(createdAt).toLocaleString("default", { month: "short" });
    if (key in monthMap) monthMap[key] += Number(item.line_total);
  }

  const salesData = Object.entries(monthMap).map(([month, amount]) => ({ month, amount }));
  const currentMonthKey = now.toLocaleString("default", { month: "short" });
  const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString(
    "default",
    { month: "short" },
  );

  return NextResponse.json({
    shop,
    stats: {
      productCount,
      balance,
      totalOrders: orderIds.length,
      totalSales,
      views: sellerViews,
      rating: shopRating,
    },
    orders: orderBreakdown,
    categoryProducts,
    salesData,
    currentMonthSales: monthMap[currentMonthKey] ?? 0,
    lastMonthSales: monthMap[lastMonthKey] ?? 0,
    topProducts: (topProductsResult.data ?? []).map((p) => ({
      id: p.id,
      name: p.title,
      price: `$${Number(p.price).toFixed(2)}`,
      image: p.image_url ?? null,
      rating: Math.round(Number(p.rating)),
    })),
  });
}
