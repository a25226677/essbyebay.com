import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

// Helper: return ISO date range for named presets
function dateRange(preset: string): { from: string; to: string } | null {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);

  switch (preset) {
    case "today":
      return { from: todayStart.toISOString(), to: todayEnd.toISOString() };
    case "yesterday": {
      const s = new Date(todayStart.getTime() - 86400000);
      const e = new Date(todayStart.getTime() - 1);
      return { from: s.toISOString(), to: e.toISOString() };
    }
    case "last7":
      return {
        from: new Date(todayStart.getTime() - 6 * 86400000).toISOString(),
        to: todayEnd.toISOString(),
      };
    case "last30":
      return {
        from: new Date(todayStart.getTime() - 29 * 86400000).toISOString(),
        to: todayEnd.toISOString(),
      };
    case "this_month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: s.toISOString(), to: todayEnd.toISOString() };
    }
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const search = (sp.get("search") || "").trim();
  const status = sp.get("status") || "";
  const payment_status = sp.get("payment_status") || "";
  const seller_id = sp.get("seller_id") || "";
  const datePreset = sp.get("date") || "";
  const dateFrom = sp.get("from") || "";
  const dateTo = sp.get("to") || "";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("orders")
    .select(
      `id, status, payment_status, subtotal, shipping_fee, discount_amount, total_amount, created_at, updated_at,
       profiles!orders_user_id_fkey(id, full_name, phone),
       order_items(id, seller_id, quantity, unit_price, line_total,
         products(id, title, image_url, slug))`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("id", `%${search}%`);
  if (status) query = query.eq("status", status);
  if (payment_status) query = query.eq("payment_status", payment_status);

  // Date filters
  const range = datePreset ? dateRange(datePreset) : null;
  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  } else if (dateFrom) {
    query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);
  }

  // Filter by seller (via subquery through order_items)
  if (seller_id) {
    // We'll filter post-fetch for seller_id since supabase doesn't support nested eq filters well
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let items = data || [];

  // Seller filter post-process
  if (seller_id) {
    items = items.filter((o) =>
      Array.isArray(o.order_items) &&
      o.order_items.some((i: { seller_id: string }) => i.seller_id === seller_id),
    );
  }

  return NextResponse.json({
    items,
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}
