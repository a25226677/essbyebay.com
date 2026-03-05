import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";

export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const operator = searchParams.get("operator") || "";
    const date = searchParams.get("date") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = 10;
    const from = (page - 1) * perPage;

    let query = db
      .from("offline_recharges")
      .select("*, user:profiles!offline_recharges_user_id_fkey(full_name,avatar_url,phone), operator:profiles!offline_recharges_operator_id_fkey(full_name)", { count: "exact" });

    if (search) query = query.ilike("profiles.full_name", `%${search}%`);
    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0);
      const end = new Date(date); end.setHours(23,59,59,999);
      query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
    }
    query = query.order("created_at", { ascending: false }).range(from, from + perPage - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data || [], total: count || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const body = await req.json();
    const { id, is_approved } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // If approving, credit user wallet
    if (is_approved === true) {
      const { data: record } = await db.from("offline_recharges").select("*").eq("id", id).single();
      if (record && record.user_id && record.amount) {
        // Get current wallet balance
        const { data: profile } = await db.from("profiles").select("wallet_balance").eq("id", record.user_id).single();
        const currentBalance = profile?.wallet_balance || 0;
        await db.from("profiles").update({ wallet_balance: currentBalance + record.amount }).eq("id", record.user_id);
        // Record transaction
        await db.from("wallet_transactions").insert({
          user_id: record.user_id,
          amount: record.amount,
          type: "credit",
          description: `Offline recharge approved (TXN: ${record.txn_id || "N/A"})`,
          reference_id: id,
        });
      }
    }

    const { data, error } = await db
      .from("offline_recharges")
      .update({ is_approved, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
