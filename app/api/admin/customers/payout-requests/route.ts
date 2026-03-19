import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";
import { sendWalletWithdrawalEmail } from "@/lib/email";

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

  const { data: existingReq } = await db
    .from("payout_requests")
    .select("id, amount, user_id, status, method")
    .eq("id", id)
    .single();

  if (!existingReq) {
    return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = String(status).toLowerCase();
  if (admin_note !== undefined) updates.admin_note = admin_note;

  const { error } = await db.from("payout_requests").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let currentBalance: number | undefined;

  // If approved/paid — deduct from customer wallet (only on status transition)
  if (updates.status === "paid" && existingReq.status !== "paid") {
    const { data: profile } = await db
      .from("profiles")
      .select("wallet_balance")
      .eq("id", existingReq.user_id)
      .single();
    const newBal = Math.max(0, Number(profile?.wallet_balance ?? 0) - Number(existingReq.amount));
    currentBalance = newBal;
    await db.from("profiles").update({ wallet_balance: newBal }).eq("id", existingReq.user_id);
    await db.from("wallet_transactions").insert({
      user_id: existingReq.user_id,
      amount: existingReq.amount,
      type: "debit",
      note: "Payout paid",
    });
  }

  // Notify user about payout request status updates (non-blocking)
  if (status) {
    try {
      const { data: { user } } = await db.auth.admin.getUserById(existingReq.user_id);
      if (user?.email) {
        const { data: profile } = await db
          .from("profiles")
          .select("full_name,wallet_balance")
          .eq("id", existingReq.user_id)
          .single();

        await sendWalletWithdrawalEmail({
          to: user.email,
          customerName: profile?.full_name || "User",
          amount: Number(existingReq.amount || 0),
          status: String(status),
          method: existingReq.method || undefined,
          reference: existingReq.id,
          balance: currentBalance ?? Number(profile?.wallet_balance ?? 0),
          note: typeof admin_note === "string" ? admin_note : undefined,
        });
      }
    } catch {
      // Non-blocking
    }
  }

  return NextResponse.json({ success: true });
}
