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
       profiles!orders_user_id_fkey(id, full_name, phone),
       order_items(
         id, seller_id, quantity, unit_price, line_total,
         products(id, title, image_url, slug, price),
         profiles!order_items_seller_id_fkey(id, full_name)
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

  // Filter by seller_id
  if (seller_id) {
    items = items.filter((o) =>
      Array.isArray(o.order_items) &&
      (o.order_items as { seller_id: string }[]).some((i) => i.seller_id === seller_id),
    );
  }

  // order_type: "seller" orders have at least one item with a seller profile that has a shop,
  // "inhouse" orders have items belonging to admin (seller_id is the admin's own profile).
  // We approximate: seller orders = items where seller profile exists; inhouse = no real shop.
  if (order_type === "seller") {
    items = items.filter((o) =>
      Array.isArray(o.order_items) &&
      (o.order_items as { profiles: { full_name: string } | null }[]).some(
        (i) => i.profiles !== null,
      ),
    );
  }

  // Enrich items with computed fields
  const enriched = items.map((o) => {
    const oi = (o.order_items as {
      id: string; seller_id: string; quantity: number; unit_price: number; line_total: number;
      products: { id: string; title: string; image_url: string | null; slug: string; price: number } | null;
      profiles: { id: string; full_name: string } | null;
    }[]) || [];

    // First seller name for the "Shop" column
    const firstSeller = oi.find((i) => i.profiles)?.profiles?.full_name ?? null;
    const numProducts = oi.reduce((s, i) => s + i.quantity, 0);

    // Profit = 10% platform fee on subtotal
    const profit = Number(((o.subtotal as number) * 0.1).toFixed(2));

    return {
      ...o,
      order_code: makeOrderCode(o.created_at as string),
      shop_name:  firstSeller,
      num_products: numProducts,
      profit,
    };
  });

  return NextResponse.json({
    items: enriched,
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}
