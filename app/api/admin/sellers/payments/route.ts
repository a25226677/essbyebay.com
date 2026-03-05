import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp       = request.nextUrl.searchParams;
  const sellerId = sp.get("seller_id") || "";
  const page  = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("seller_payments")
    .select(
      "id, amount, payment_details, trx_id, created_at, seller_id, profiles!seller_payments_seller_id_fkey(id, full_name, phone)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (sellerId) query = query.eq("seller_id", sellerId);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach shop names
  const items = data || [];
  const enriched = await Promise.all(
    items.map(async (p: Record<string, unknown>) => {
      const sid = (p.profiles as Record<string, unknown> | null)?.id as string | null;
      let shopName: string | null = null;
      if (sid) {
        const { data: shop } = await db.from("shops").select("name").eq("owner_id", sid).maybeSingle();
        shopName = shop?.name || null;
      }
      return { ...p, shop_name: shopName };
    })
  );

  return NextResponse.json({
    items: enriched,
    pagination: { page, limit, total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / limit)) },
  });
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db, userId } = context;

  const body = await request.json();
  const { seller_id, amount, payment_details, trx_id } = body;
  if (!seller_id || !amount) return NextResponse.json({ error: "seller_id and amount required" }, { status: 400 });

  const { data, error } = await db.from("seller_payments").insert({
    seller_id, amount, payment_details: payment_details || null, trx_id: trx_id || null, admin_id: userId,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("seller_payments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
