import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("user_searches").select("*", {count:"exact"});
    if (search) query = query.ilike("search_term", `%${search}%`);
    query = query.order("created_at",{ascending:false}).range(from, from+perPage-1);
    const {data,error,count} = await query;
    if (error) throw error;
    // Manually join user profiles since FK references auth.users not profiles
    const rows = data || [];
    const userIds = [...new Set(rows.map((r:any)=>r.user_id).filter(Boolean))];
    const profileMap = new Map<string,string>();
    if (userIds.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id, full_name").in("id", userIds);
      (profiles||[]).forEach((p:any)=>profileMap.set(p.id, p.full_name));
    }
    const enriched = rows.map((r:any)=>({...r, profiles: { full_name: profileMap.get(r.user_id) || null }}));
    return NextResponse.json({data:enriched,total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
