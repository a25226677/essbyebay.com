import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

/** Generate order code like 20260304-09201154 from a date */
export function makeOrderCode(dateStr: string): string {
  const d = new Date(dateStr);
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const time = d.toISOString().slice(11, 19).replace(/:/g, "") +
    String(d.getMilliseconds()).padStart(3, "0").slice(0, 2);
  return `${date}-${time}`;
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const search          = (sp.get("search") || "").trim();
  const delivery_status = sp.get("delivery_status") || "";
  const payment_status  = sp.get("payment_status") || "";
  const seller_id       = sp.get("seller_id") || "";
  const order_type      = sp.get("order_type") || ""; // "seller" | "inhouse"
  const dateFrom        = sp.get("from") || "";
  const dateTo          = sp.get("to") || "";
  const page   = Math.max(1, parseInt(sp.get("page")  || "1",  10));
  const limit  = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("orders")
    .select(
      `id, status, payment_status, payment_method,
       delivery_status, pickup_status, tracking_code,
       subtotal, shipping_fee, discount_amount, total_amount,
       created_at, updated_at, notes,
       profiles!orders_user_id_fkey(id, full_name, phone)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (delivery_status) query = query.eq("delivery_status", delivery_status);
  if (payment_status)  query = query.eq("payment_status", payment_status);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo)   query = query.lte("created_at", dateTo + "T23:59:59Z");

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let items = (data || []) as Record<string, unknown>[];

  // Search by generated order code or customer name
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((o) => {
      const code = makeOrderCode(o.created_at as string).toLowerCase();
      const cust = ((o.profiles as { full_name?: string } | null)?.full_name || "").toLowerCase();
      return code.includes(q) || cust.includes(q);
    });
  }

  // --- Fetch order_items with product_id for shop lookup ---
  const orderIds = items.map((o) => o.id as string);
  const orderItemsResult = orderIds.length > 0
    ? await db.from("order_items").select("order_id, seller_id, product_id, quantity").in("order_id", orderIds)
    : { data: [] as { order_id: string; seller_id: string | null; product_id: string; quantity: number }[] };

  // Map: order_id => total quantity & first product_id & first seller_id
  const itemCountMap = new Map<string, number>();
  const orderProductMap = new Map<string, string>(); // order_id → first product_id
  const orderSellerMap = new Map<string, string>();  // order_id → first seller_id
  for (const row of (orderItemsResult.data || [])) {
    const oid = row.order_id;
    itemCountMap.set(oid, (itemCountMap.get(oid) ?? 0) + (row.quantity ?? 1));
    if (!orderProductMap.has(oid) && row.product_id) orderProductMap.set(oid, row.product_id);
    if (!orderSellerMap.has(oid) && row.seller_id)  orderSellerMap.set(oid, row.seller_id);
  }

  // Map product → shop_id, then fetch shop names by shop id & by owner_id
  const allProductIds = [...new Set([...orderProductMap.values()])];
  const [productShopsResult, shopsResult] = await Promise.all([
    allProductIds.length > 0
      ? db.from("products").select("id, shop_id").in("id", allProductIds)
      : Promise.resolve({ data: [] as { id: string; shop_id: string }[] }),
    db.from("shops").select("id, owner_id, name"),
  ]);

  const productShopMap = new Map<string, string>(); // product_id → shop_id
  for (const p of (productShopsResult.data || [])) {
    if (p.shop_id) productShopMap.set(p.id, p.shop_id);
  }
  const shopByIdMap  = new Map<string, string>(); // shop_id   → name
  const shopByOwnerMap = new Map<string, string>(); // owner_id → name
  for (const shop of (shopsResult.data || [])) {
    shopByIdMap.set(shop.id, shop.name);
    shopByOwnerMap.set(shop.owner_id, shop.name);
  }

  // Filter by seller_id
  if (seller_id) {
    items = items.filter((o) => {
      const sid = orderSellerMap.get(o.id as string);
      return sid === seller_id;
    });
  }

  if (order_type === "seller") {
    items = items.filter((o) => orderSellerMap.has(o.id as string));
  }

  // Enrich items with computed fields
  const enriched = items.map((o) => {
    const oid      = o.id as string;
    const numProducts   = itemCountMap.get(oid) ?? 0;
    const firstProductId = orderProductMap.get(oid);
    const firstSellerId  = orderSellerMap.get(oid) ?? null;
    // Shop name: product → shop_id path is most reliable; fall back to seller → owner_id
    const shopId   = firstProductId ? (productShopMap.get(firstProductId) ?? null) : null;
    const shopName = shopId
      ? (shopByIdMap.get(shopId) ?? null)
      : firstSellerId
        ? (shopByOwnerMap.get(firstSellerId) ?? null)
        : null;

    // Profit = 15–20% platform fee on subtotal (varies by order, deterministic)
    const rateOffset = parseInt(oid.replace(/-/g, "").slice(-4), 16) % 100 / 100;
    const rate = 0.15 + rateOffset * 0.05; // 0.15 to 0.20
    const profit = Number(((o.subtotal as number) * rate).toFixed(2));

    return {
      ...o,
      order_code: makeOrderCode(o.created_at as string),
      shop_name: shopName,
      num_products: numProducts,
      payment_status: o.payment_status || "pending",
      profit,
    };
  });

  return NextResponse.json({
    items: enriched,
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}
