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

  // --- Fetch order_items explicitly to ensure accurate product counts ---
  const orderIds = items.map((o) => o.id as string);
  const [orderItemsResult, shopsResult] = await Promise.all([
    orderIds.length > 0
      ? db.from("order_items").select("order_id, seller_id, quantity").in("order_id", orderIds)
      : Promise.resolve({ data: [] as { order_id: string; seller_id: string | null; quantity: number }[] }),
    db.from("shops").select("owner_id, name"),
  ]);

  // Map: order_id => total quantity
  const itemCountMap = new Map<string, number>();
  // Map: order_id => first seller_id
  const orderSellerMap = new Map<string, string>();
  for (const row of (orderItemsResult.data || [])) {
    const oid = row.order_id;
    itemCountMap.set(oid, (itemCountMap.get(oid) ?? 0) + (row.quantity ?? 1));
    if (!orderSellerMap.has(oid) && row.seller_id) {
      orderSellerMap.set(oid, row.seller_id);
    }
  }

  // Map: owner_id => shop name
  const shopNameMap = new Map<string, string>();
  for (const shop of (shopsResult.data || [])) {
    shopNameMap.set(shop.owner_id, shop.name);
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
    const oid = o.id as string;
    const numProducts = itemCountMap.get(oid) ?? 0;
    const firstSellerId = orderSellerMap.get(oid) ?? null;
    const shopName = firstSellerId ? (shopNameMap.get(firstSellerId) ?? null) : null;

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
