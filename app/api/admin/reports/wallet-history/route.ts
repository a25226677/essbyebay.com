import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")||"1");
    const search = searchParams.get("search")||"";
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("wallet_transactions")
      .select("*", {count:"exact"});
    query = query.order("created_at",{ascending:false}).range(from,from+perPage-1);
    const {data,error,count} = await query;
    if (error) throw error;
    // Manual join profiles (wallet_transactions.user_id FK is to profiles)
    const rows = data || [];
    const userIds = [...new Set(rows.map((r:any)=>r.user_id).filter(Boolean))];
    const profileMap = new Map<string,any>();
    if (userIds.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id,full_name,avatar_url").in("id", userIds);
      (profiles||[]).forEach((p:any)=>profileMap.set(p.id, p));
    }
    let enriched = rows.map((r:any)=>({...r, profiles: profileMap.get(r.user_id) || null}));
    if (search) enriched = enriched.filter((r:any)=>r.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()));
    return NextResponse.json({data:enriched,total:search ? enriched.length : (count||0)});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
