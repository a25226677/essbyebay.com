import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

type DashboardOrderRow = {
  id: string;
  status: string | null;
  delivery_status: string | null;
  created_at: string | null;
};

type DashboardOrderBucket = "newOrder" | "processing" | "cancelled" | "onDelivery" | "delivered";

function getDashboardOrderBucket(order: Pick<DashboardOrderRow, "status" | "delivery_status">): DashboardOrderBucket {
  const status = order.status ?? "";
  const deliveryStatus = order.delivery_status ?? "";

  if (deliveryStatus === "cancelled" || status === "cancelled") return "cancelled";
  if (deliveryStatus === "delivered" || status === "delivered") return "delivered";
  if (deliveryStatus === "on_the_way" || status === "shipped") return "onDelivery";
  if (deliveryStatus === "confirmed" || deliveryStatus === "picked_up" || status === "processing") {
    return "processing";
  }

  return "newOrder";
}

export async function GET() {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  // ── STEP 1: Get seller's product IDs for fallback matching ─────────────────
  const { data: sellerProductsData } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", userId);

  const sellerProductIds = (sellerProductsData || []).map((p) => p.id);

  // ── STEP 2: Fetch order items using multi-strategy approach ────────────────
  const { queryInBatches } = await import("@/lib/supabase/query-helpers");

  type OrderItemRow = {
    id: string;
    order_id: string;
    quantity: number;
    seller_id: string;
    product_id: string;
    line_total: number;
  };

  const [strictRes, fallbackRes, frozeRes] = await Promise.all([
    // Direct: order_items where seller_id = userId
    supabase
      .from("order_items")
      .select("id, order_id, quantity, seller_id, product_id, line_total")
      .eq("seller_id", userId),

    // Fallback: order_items for any product the seller currently owns (batched)
    queryInBatches<OrderItemRow>(
      (chunk) =>
        supabase
          .from("order_items")
          .select("id, order_id, quantity, seller_id, product_id, line_total")
          .in("product_id", chunk) as unknown as PromiseLike<{ data: OrderItemRow[] | null; error: { message: string } | null }>,
      sellerProductIds,
    ),

    // Frozen orders — direct seller→order link independent of order_items
    supabase
      .from("froze_orders")
      .select("order_id")
      .eq("seller_id", userId),
  ]);

  // Deduplicate order items (remove duplicates from strict + fallback)
  const rawItems = [...(strictRes.data || []), ...(fallbackRes.data || [])];
  const uniqueItemsMap = new Map(rawItems.map((r) => [r.id, r]));
  const orderItemRows = Array.from(uniqueItemsMap.values());

  // Get order IDs from order_items
  const orderIds = [
    ...new Set(
      orderItemRows
        .map((r: { order_id: string }) => r.order_id)
        .filter(Boolean)
    ),
  ];

  // Also include froze_orders that don't have order_items
  const frozeOrderIds = (frozeRes.data || [])
    .map((r: { order_id: string }) => r.order_id)
    .filter((id) => id && !orderIds.includes(id));
  const allOrderIds = [...orderIds, ...frozeOrderIds];

  // ── STEP 3: Run remaining queries in parallel ─────────────────────────────
  const [
    productsCountResult,
    topProductsResult,
    categoryCountResult,
    shopResult,
  ] = await Promise.all([
    // Product count
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId),

    // Top 12 products by rating
    supabase
      .from("products")
      .select("id,title,price,image_url,rating,review_count")
      .eq("seller_id", userId)
      .eq("is_active", true)
      .order("rating", { ascending: false })
      .limit(12),

    // Category breakdown
    supabase
      .from("products")
      .select("category_id,categories(name)")
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

  // Get seller views and balance
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("seller_views,wallet_balance")
    .eq("id", userId)
    .maybeSingle();
  const sellerViews = sellerProfile?.seller_views ?? 0;
  const shopRating = Number(shop?.rating ?? 0);
  const balance = Number(sellerProfile?.wallet_balance ?? 0);

  // ── STEP 4: Fetch order details ───────────────────────────────────────────
  const ordersResult =
    allOrderIds.length > 0
      ? await queryInBatches<DashboardOrderRow>(
          (chunk) =>
            supabase
              .from("orders")
              .select("id,status,delivery_status,created_at")
              .in("id", chunk) as unknown as PromiseLike<{ data: DashboardOrderRow[] | null; error: { message: string } | null }>,
          allOrderIds,
        )
      : { data: [] as DashboardOrderRow[], error: null };

  const orders = ordersResult.data ?? [];

  // ── STEP 5: Build order breakdown and identify delivered orders ────────────
  const orderBreakdown = {
    newOrder: 0,
    processing: 0,
    cancelled: 0,
    onDelivery: 0,
    delivered: 0,
  };

  const orderMap = new Map(orders.map((order) => [order.id, order]));
  const deliveredOrderIds = new Set<string>();

  for (const order of orders) {
    const bucket = getDashboardOrderBucket(order);
    orderBreakdown[bucket] += 1;
    if (bucket === "delivered") deliveredOrderIds.add(order.id);
  }

  // ── STEP 6: Calculate totals (delivered orders only) ──────────────────────
  const totalSales = orderItemRows.reduce((sum, row) => {
    if (!deliveredOrderIds.has(row.order_id)) return sum;
    return sum + Number(row.line_total);
  }, 0);

  // ── STEP 7: Calculate category breakdown ───────────────────────────────────
  const catMap: Record<string, { name: string; count: number }> = {};
  for (const product of categoryCountResult.data ?? []) {
    const catId = (product.category_id as string) || "__none__";
    const catName =
      (product.categories as unknown as { name: string }[] | null)?.[0]?.name ?? "Uncategorized";
    if (!catMap[catId]) catMap[catId] = { name: catName, count: 0 };
    catMap[catId].count++;
  }
  const categoryProducts = Object.values(catMap)
    .sort((a, b) => b.count - a.count)
    .map((c) => ({ name: c.name, count: c.count }));

  // ── STEP 8: Calculate monthly sales (delivered orders only) ────────────────
  const now = new Date();
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(d.toLocaleString("default", { month: "short" }));
  }
  const monthMap: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));

  for (const item of orderItemRows) {
    if (!deliveredOrderIds.has(item.order_id)) continue;
    const createdAt = orderMap.get(item.order_id)?.created_at;
    if (!createdAt) continue;
    const key = new Date(createdAt).toLocaleString("default", { month: "short" });
    if (key in monthMap) monthMap[key] += Number(item.line_total);
  }

  const salesData = Object.entries(monthMap).map(([month, amount]) => ({ month, amount }));
  const currentMonthKey = now.toLocaleString("default", { month: "short" });
  const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString(
    "default",
    { month: "short" }
  );

  return NextResponse.json({
    shop,
    stats: {
      productCount,
      balance,
      totalOrders: deliveredOrderIds.size,
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
