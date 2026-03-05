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
      .select("*, profiles!wallet_transactions_user_id_fkey(full_name,avatar_url)", {count:"exact"});
    if (search) query = query.ilike("profiles.full_name", `%${search}%`);
    query = query.order("created_at",{ascending:false}).range(from,from+perPage-1);
    const {data,error,count} = await query;
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
