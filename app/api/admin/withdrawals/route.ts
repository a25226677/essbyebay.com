import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const status    = sp.get("status") || "";
  const sellerId  = sp.get("seller_id") || "";
  const page  = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("withdrawals")
    .select(
      `id, seller_id, amount, status, method, account_info, notes, created_at, updated_at`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (status)   query = query.eq("status", status);
  if (sellerId) query = query.eq("seller_id", sellerId);
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach shop name for each withdrawal
  const items = data || [];
  // Batch-fetch seller profiles and shops
  const sellerIds = [...new Set(items.map((w: any) => w.seller_id).filter(Boolean))];
  const profileMap = new Map<string, any>();
  const shopMap = new Map<string, string>();
  if (sellerIds.length > 0) {
    const { data: profiles } = await db.from("profiles").select("id, full_name, phone, avatar_url, wallet_balance").in("id", sellerIds);
    (profiles || []).forEach((p: any) => profileMap.set(p.id, p));
    const { data: shops } = await db.from("shops").select("name, owner_id").in("owner_id", sellerIds);
    (shops || []).forEach((s: any) => shopMap.set(s.owner_id, s.name));
  }
  const enriched = items.map((w: any) => ({
    ...w,
    profiles: profileMap.get(w.seller_id) || null,
    shop_name: shopMap.get(w.seller_id) || null,
  }));

  return NextResponse.json({
    items: enriched,
    pagination: { page, limit, total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / limit)) },
  });
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const body = await request.json();
  const { seller_id, amount, method, account_info, notes } = body;
  if (!seller_id || !amount) return NextResponse.json({ error: "seller_id and amount required" }, { status: 400 });

  const { data, error } = await db.from("withdrawals").insert({
    seller_id, amount, method: method || "bank",
    account_info: account_info || null,
    notes: notes || null,
    status: "pending",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const body = await request.json();
  const { id, status, notes } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (status) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  updates.updated_at = new Date().toISOString();

  // If paid → deduct from seller wallet + record seller_payment
  if (status === "paid") {
    const { data: wd } = await db.from("withdrawals").select("seller_id, amount").eq("id", id).single();
    if (wd) {
      const { data: prof } = await db.from("profiles").select("wallet_balance, total_withdrawn").eq("id", wd.seller_id).single();
      const newBal = Math.max(0, Number(prof?.wallet_balance ?? 0) - Number(wd.amount));
      const newWithdrawn = Number(prof?.total_withdrawn ?? 0) + Number(wd.amount);
      await db.from("profiles").update({ wallet_balance: newBal, total_withdrawn: newWithdrawn }).eq("id", wd.seller_id);
      // Record seller payment entry
      await db.from("seller_payments").insert({
        seller_id: wd.seller_id,
        amount: wd.amount,
        payment_details: `Withdrawal payout (${body.withdraw_type || "bank"})`,
        trx_id: `WD-${Date.now()}`,
      });
    }
  }

  const { error } = await db.from("withdrawals").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
