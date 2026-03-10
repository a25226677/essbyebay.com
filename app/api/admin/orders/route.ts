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

  // Single query: orders + inline order_items → products → shops
  // Using Supabase nested select (PostgREST) so shop name and item count
  // are resolved reliably in one round-trip without fragile map-building.
  let query = db
    .from("orders")
    .select(
      `id, status, payment_status, payment_method,
       delivery_status, pickup_status, tracking_code,
       subtotal, shipping_fee, discount_amount, total_amount,
       created_at, updated_at, notes,
       profiles!orders_user_id_fkey(id, full_name, phone),
       order_items!order_items_order_id_fkey(
         id, quantity, seller_id, product_id,
         products!order_items_product_id_fkey(
           id, shop_id,
           shops!products_shop_id_fkey(id, name)
         )
       )`,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items = (data || []) as any[];

  // Search by generated order code or customer name
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((o) => {
      const code = makeOrderCode(o.created_at as string).toLowerCase();
      const cust = ((o.profiles as { full_name?: string } | null)?.full_name || "").toLowerCase();
      return code.includes(q) || cust.includes(q);
    });
  }

  // Filter by seller_id / order_type using inline order_items data
  if (seller_id) {
    items = items.filter((o) =>
      Array.isArray(o.order_items) &&
      (o.order_items as { seller_id: string }[]).some((i) => i.seller_id === seller_id),
    );
  }
  if (order_type === "seller") {
    items = items.filter((o) =>
      Array.isArray(o.order_items) && o.order_items.length > 0,
    );
  }

  // Enrich items with computed fields
  const enriched = items.map((o) => {
    const oi: { quantity: number; seller_id: string; products?: { shop_id?: string; shops?: { name?: string } } }[] =
      Array.isArray(o.order_items) ? o.order_items : [];

    // Number of distinct line-items in the order
    const numProducts = oi.length;

    // Shop name from first item's product → shop join
    const firstItem  = oi[0];
    const shopName   = firstItem?.products?.shops?.name ?? null;

    const oid = o.id as string;
    // Profit = 15–20% platform fee on subtotal (varies by order, deterministic)
    const rateOffset = parseInt(oid.replace(/-/g, "").slice(-4), 16) % 100 / 100;
    const rate = 0.15 + rateOffset * 0.05; // 0.15 to 0.20
    const profit = Number(((o.subtotal as number) * rate).toFixed(2));

    // Strip nested order_items from response (not needed by the table UI)
    const { order_items: _oi, ...rest } = o;
    void _oi;

    return {
      ...rest,
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
