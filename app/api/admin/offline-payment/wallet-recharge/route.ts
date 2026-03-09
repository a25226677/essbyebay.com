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
      .select("*", { count: "exact" });
    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0);
      const end = new Date(date); end.setHours(23,59,59,999);
      query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
    }
    query = query.order("created_at", { ascending: false }).range(from, from + perPage - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    // Manually join profiles since offline_recharges FK references auth.users not profiles
    const rows = data || [];
    const allIds = [...new Set([...rows.map((r:any)=>r.user_id), ...rows.map((r:any)=>r.operator_id)].filter(Boolean))];
    const profileMap = new Map<string,any>();
    if (allIds.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id, full_name, avatar_url, phone").in("id", allIds);
      (profiles||[]).forEach((p:any)=>profileMap.set(p.id, p));
    }
    const enriched = rows.map((r:any)=>{
      const u = profileMap.get(r.user_id);
      const o = profileMap.get(r.operator_id);
      return { ...r, user: u ? { full_name: u.full_name, avatar_url: u.avatar_url, phone: u.phone } : null, operator: o ? { full_name: o.full_name } : null };
    });
    // Filter by search on joined profile name
    let result = enriched;
    if (search) result = enriched.filter((r:any)=>r.user?.full_name?.toLowerCase().includes(search.toLowerCase()));
    return NextResponse.json({ data: result, total: search ? result.length : (count || 0) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db, userId } = _ctx;
    const body = await req.json();
    const { id, is_approved } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { data: record } = await db.from("offline_recharges").select("*").eq("id", id).single();
    if (!record) return NextResponse.json({ error: "Recharge request not found" }, { status: 404 });

    if (record.is_approved && is_approved === false) {
      return NextResponse.json({ error: "Approved recharge cannot be reverted from this screen" }, { status: 400 });
    }

    // If approving, credit user wallet
    if (is_approved === true && !record.is_approved) {
      if (record.user_id && record.amount) {
        // Get current wallet balance
        const { data: profile } = await db.from("profiles").select("wallet_balance").eq("id", record.user_id).single();
        const currentBalance = profile?.wallet_balance || 0;
        await db.from("profiles").update({ wallet_balance: currentBalance + record.amount }).eq("id", record.user_id);
        // Record transaction
        await db.from("wallet_transactions").insert({
          user_id: record.user_id,
          amount: record.amount,
          type: "recharge",
          note: `Offline recharge approved (TXN: ${record.txn_id || "N/A"})`,
        });
      }
    }

    const { data, error } = await db
      .from("offline_recharges")
      .update({ is_approved, operator_id: userId, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
