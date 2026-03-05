import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp     = request.nextUrl.searchParams;
  const status = sp.get("status") || "";
  const page   = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit  = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("payout_requests")
    .select(
      `id, amount, method, account_info, status, admin_note, created_at, updated_at,
       profiles!payout_requests_user_id_fkey(id, full_name, phone, wallet_balance)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data || [],
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const { id, status, admin_note } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (admin_note !== undefined) updates.admin_note = admin_note;

  const { error } = await db.from("payout_requests").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If approved/paid — deduct from customer wallet
  if (status === "paid") {
    const { data: req } = await db.from("payout_requests").select("amount, user_id").eq("id", id).single();
    if (req) {
      const { data: profile } = await db.from("profiles").select("wallet_balance").eq("id", req.user_id).single();
      const newBal = Math.max(0, Number(profile?.wallet_balance ?? 0) - Number(req.amount));
      await db.from("profiles").update({ wallet_balance: newBal }).eq("id", req.user_id);
      await db.from("wallet_transactions").insert({
        user_id: req.user_id, amount: req.amount, type: "debit", note: "Payout paid",
      });
    }
  }

  return NextResponse.json({ success: true });
}
