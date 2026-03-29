import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

type DashboardOrderRow = {
  id: string;
  status: string | null;
  delivery_status: string | null;
  created_at: string | null;
};

type DashboardOrderBucket = "newOrder" | "processing" | "cancelled" | "onDelivery" | "delivered";

type SellerCategoryRow = { category_id: string | null };

async function fetchAllSellerCategoryRows(
  supabase: ReturnType<typeof createAdminServiceClient>,
  userId: string,
) {
  const PAGE_SIZE = 1000;
  let from = 0;
  const rows: SellerCategoryRow[] = [];

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("products")
      .select("category_id")
      .eq("seller_id", userId)
      .range(from, to);

    if (error) {
      return { data: [] as SellerCategoryRow[], error };
    }

    const chunk = (data || []) as SellerCategoryRow[];
    if (chunk.length === 0) break;

    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return { data: rows, error: null as { message: string } | null };
}

function getDashboardOrderBucket(order: Pick<DashboardOrderRow, "status" | "delivery_status">): DashboardOrderBucket {
  const status = (order.status ?? "").trim().toLowerCase();
  const deliveryStatus = (order.delivery_status ?? "").trim().toLowerCase();

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

  const { userId } = context;
  const supabase = createAdminServiceClient();

  // ── STEP 1: Get seller's product IDs for fallback matching ─────────────────
  const { data: sellerProductsData } = await supabase
    .from("products")
    .select("id")
    .eq("seller_id", userId);

  // ── STEP 2: Fetch order items using multi-strategy approach ────────────────
  const { queryInBatches, sanitizeUuids } = await import("@/lib/supabase/query-helpers");
  const sellerProductIds = sanitizeUuids((sellerProductsData || []).map((p) => p.id));

  type OrderItemRow = {
    id: string;
    order_id: string;
    quantity: number;
    seller_id: string;
    product_id: string;
    line_total: number;
    storehouse_price: number;
  };

  type FrozeOrderRow = {
    order_id: string;
    amount: number | null;
    profit: number | null;
  };

  const [strictRes, fallbackRes, frozeRes, sellerProfileRes] = await Promise.all([
    // Direct: order_items where seller_id = userId
    supabase
      .from("order_items")
      .select("id, order_id, quantity, seller_id, product_id, line_total, storehouse_price")
      .eq("seller_id", userId),

    // Fallback: order_items for any product the seller currently owns (batched)
    queryInBatches<OrderItemRow>(
      (chunk) =>
        supabase
          .from("order_items")
          .select("id, order_id, quantity, seller_id, product_id, line_total, storehouse_price")
          .in("product_id", chunk) as unknown as PromiseLike<{ data: OrderItemRow[] | null; error: { message: string } | null }>,
      sellerProductIds,
    ),

    // Frozen orders — direct seller→order link independent of order_items
    supabase
      .from("froze_orders")
      .select("order_id, amount, profit")
      .eq("seller_id", userId),

    // Pre-fetch seller profile to avoid redundant query later
    supabase
      .from("profiles")
      .select("seller_views,wallet_balance,pending_balance")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (strictRes.error) {
    return NextResponse.json({ error: strictRes.error.message, step: "order_items_strict" }, { status: 500 });
  }
  if (fallbackRes.error) {
    return NextResponse.json({ error: fallbackRes.error.message, step: "order_items_fallback" }, { status: 500 });
  }
  if (frozeRes.error) {
    return NextResponse.json({ error: frozeRes.error.message, step: "froze_orders" }, { status: 500 });
  }
  if (sellerProfileRes.error) {
    return NextResponse.json({ error: sellerProfileRes.error.message, step: "seller_profile" }, { status: 500 });
  }

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
  const allOrderIds = sanitizeUuids([...orderIds, ...frozeOrderIds]);

  // ── STEP 3: Run remaining queries in parallel ─────────────────────────────
  const [
    productsCountResult,
    topProductsResult,
    shopResult,
    categoryRowsResult,
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

    // Shop info
    supabase
      .from("shops")
      .select("id,name,is_verified,product_count,logo_url,rating")
      .eq("owner_id", userId)
      .maybeSingle(),

    // Category breakdown: fetch all seller product categories in batches
    fetchAllSellerCategoryRows(supabase, userId),
  ]);

  const productCount = productsCountResult.count ?? 0;
  const shop = shopResult.data;

  if (productsCountResult.error) {
    return NextResponse.json({ error: productsCountResult.error.message, step: "product_count" }, { status: 500 });
  }

  if (topProductsResult.error) {
    return NextResponse.json({ error: topProductsResult.error.message, step: "top_products" }, { status: 500 });
  }
  if (categoryRowsResult.error) {
    return NextResponse.json({ error: categoryRowsResult.error.message, step: "category_breakdown" }, { status: 500 });
  }
  if (shopResult.error) {
    return NextResponse.json({ error: shopResult.error.message, step: "shop_info" }, { status: 500 });
  }

  // Use pre-fetched seller profile
  const sellerViews = sellerProfileRes.data?.seller_views ?? 0;
  const shopRating = Number(shop?.rating ?? 0);
  const availableBalance = Number(sellerProfileRes.data?.wallet_balance ?? 0);
  const pendingBalance = Number(sellerProfileRes.data?.pending_balance ?? 0);
  const totalShopBalance = Number((availableBalance + pendingBalance).toFixed(2));

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

  if (ordersResult.error) {
    return NextResponse.json({ error: ordersResult.error.message, step: "orders_fetch" }, { status: 500 });
  }

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
  const orderSalesMap = new Map<string, number>();
  const orderProfitMap = new Map<string, number>();
  const deliveredOrderIds = new Set<string>();

  for (const row of orderItemRows) {
    const lineTotal = Number(row.line_total || 0);
    const quantity = Number(row.quantity || 0);
    const storehouseUnit = Number(row.storehouse_price || 0);
    const storehouseTotal = storehouseUnit * quantity;
    const itemProfit = Math.max(0, Number((lineTotal - storehouseTotal).toFixed(2)));

    orderSalesMap.set(
      row.order_id,
      Number(((orderSalesMap.get(row.order_id) || 0) + lineTotal).toFixed(2)),
    );
    orderProfitMap.set(
      row.order_id,
      Number(((orderProfitMap.get(row.order_id) || 0) + itemProfit).toFixed(2)),
    );
  }

  for (const row of (frozeRes.data || []) as FrozeOrderRow[]) {
    if (!row.order_id || orderSalesMap.has(row.order_id)) continue;

    const grossAmount = Number(
      ((Number(row.amount || 0) || 0) + (Number(row.profit || 0) || 0)).toFixed(2),
    );
    orderSalesMap.set(row.order_id, grossAmount);
    orderProfitMap.set(row.order_id, Number((Number(row.profit || 0) || 0).toFixed(2)));
  }

  for (const order of orders) {
    const bucket = getDashboardOrderBucket(order);
    orderBreakdown[bucket] += 1;
    if (bucket === "delivered") deliveredOrderIds.add(order.id);
  }

  // ── STEP 6: Calculate totals (delivered orders only) ──────────────────────
  const totalSales = Number(
    [...deliveredOrderIds].reduce((sum, orderId) => sum + (orderSalesMap.get(orderId) || 0), 0).toFixed(2),
  );
  const totalProfit = Number(
    [...deliveredOrderIds].reduce((sum, orderId) => sum + (orderProfitMap.get(orderId) || 0), 0).toFixed(2),
  );

  // ── STEP 7: Calculate category breakdown ───────────────────────────────────
  const catMap: Record<string, { name: string; count: number }> = {};
  const uniqueCatIds = [...new Set(
    (categoryRowsResult.data ?? [])
      .map((p) => p.category_id)
      .filter((id): id is string => Boolean(id)),
  )];

  // Fetch category names for valid IDs
  type CategoryNameRow = { id: string; name: string };
  const { data: categories } = uniqueCatIds.length > 0
    ? await supabase
        .from("categories")
        .select("id,name")
        .in("id", uniqueCatIds)
    : { data: [] as CategoryNameRow[] };

  const catNameMap = new Map(
    ((categories ?? []) as CategoryNameRow[]).map((c) => [c.id, c.name]),
  );

  // Build category breakdown
  for (const product of categoryRowsResult.data ?? []) {
    const catId = (product.category_id as string) || "__none__";
    const catName = catNameMap.get(catId) || "Uncategorized";
    const bucketKey = catName === "Uncategorized" ? "__uncategorized__" : catId;
    if (!catMap[bucketKey]) catMap[bucketKey] = { name: catName, count: 0 };
    catMap[bucketKey].count++;
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

  for (const orderId of deliveredOrderIds) {
    const createdAt = orderMap.get(orderId)?.created_at;
    if (!createdAt) continue;
    const key = new Date(createdAt).toLocaleString("default", { month: "short" });
    if (key in monthMap) {
      monthMap[key] += orderSalesMap.get(orderId) || 0;
    }
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
      balance: totalShopBalance,
      availableBalance,
      pendingBalance,
      totalOrders: orders.length,
      deliveredOrders: deliveredOrderIds.size,
      totalSales,
      totalProfit,
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
