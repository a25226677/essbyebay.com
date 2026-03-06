import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    let query = db.from("products").select("id, title, sku, stock_count, price, category_id, categories!products_category_id_fkey(name)", {count:"exact"});
    if (search) query = query.ilike("title", `%${search}%`);
    query = query.order("stock_count", {ascending:true});
    const {data,error,count} = await query;
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
