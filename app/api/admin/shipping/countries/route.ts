import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 15; const from = (page-1)*perPage;
    const { data, error, count } = await db.from("shipping_countries")
      .select("*",{count:"exact"}).order("name").range(from, from+perPage-1);
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
    const { name, code } = await req.json();
    const { data, error } = await db.from("shipping_countries").insert({ name, code }).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function PATCH(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { id, is_active, name, code } = await req.json();
    const updates: any = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (name !== undefined) updates.name = name;
    if (code !== undefined) updates.code = code;
    const { data, error } = await db.from("shipping_countries").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const { error } = await db.from("shipping_countries").delete().eq("id", id!);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
