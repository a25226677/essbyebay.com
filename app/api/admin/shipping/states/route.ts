import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const countryId = searchParams.get("country_id")||"";
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("shipping_states").select("*, shipping_countries!shipping_states_country_id_fkey(name,code)",{count:"exact"});
    if (countryId) query = query.eq("country_id", countryId);
    query = query.order("name").range(from, from+perPage-1);
    const { data, error, count } = await query;
    if (error) throw error;
    return NextResponse.json({
      data: data||[],
      pagination: { page, limit: perPage, total: count||0, pages: Math.ceil((count||0)/perPage) },
    });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { country_id, name, state_code } = await req.json();
    const { data, error } = await db.from("shipping_states").insert({ country_id, name, state_code }).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function PATCH(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { id, name, state_code, is_active } = await req.json();
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (state_code !== undefined) updates.state_code = state_code;
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await db.from("shipping_states").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const { error } = await db.from("shipping_states").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
