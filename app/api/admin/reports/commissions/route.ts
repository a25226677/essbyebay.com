import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    const {data,error,count} = await db.from("commission_history")
      .select("*", {count:"exact"})
      .order("created_at",{ascending:false}).range(from, from+perPage-1);
    if (error) throw error;
    // Manually join seller profiles since FK references auth.users not profiles
    const rows = data || [];
    const sellerIds = [...new Set(rows.map((r:any)=>r.seller_id).filter(Boolean))];
    const profileMap = new Map<string,any>();
    if (sellerIds.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id, full_name, avatar_url").in("id", sellerIds);
      (profiles||[]).forEach((p:any)=>profileMap.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));
    }
    const enriched = rows.map((r:any)=>({...r, profiles: profileMap.get(r.seller_id) || { full_name: null, avatar_url: null }}));
    return NextResponse.json({data:enriched,total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
