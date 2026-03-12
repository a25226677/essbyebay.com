import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const stateId = searchParams.get("state_id")||"";
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("shipping_cities").select("*, shipping_states!shipping_cities_state_id_fkey(name)",{count:"exact"});
    if (stateId) query = query.eq("state_id", stateId);
    query = query.order("name").range(from,from+perPage-1);
    const {data,error,count} = await query;
    if (error) throw error;
    return NextResponse.json({
      data:data||[],
      pagination: { page, limit: perPage, total: count||0, pages: Math.ceil((count||0)/perPage) },
    });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { state_id, name, shipping_cost } = await req.json();
    const { data, error } = await db.from("shipping_cities").insert({ state_id, name, shipping_cost: shipping_cost||0 }).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function PATCH(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { id, name, shipping_cost, is_active } = await req.json();
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (shipping_cost !== undefined) updates.shipping_cost = shipping_cost;
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await db.from("shipping_cities").update(updates).eq("id",id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function DELETE(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const { error } = await db.from("shipping_cities").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
