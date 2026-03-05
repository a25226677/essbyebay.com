import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET() {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { data, error } = await db.from("website_pages").select("*").order("created_at", {ascending:false});
    if (error) {
      // Table might not exist yet — return empty
      return NextResponse.json({ data: [] });
    }
    return NextResponse.json({ data: data||[] });
  } catch { return NextResponse.json({ data: [] }); }
}
export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { title, slug, content, is_published } = await req.json();
    const { data, error } = await db.from("website_pages").insert({ title, slug, content, is_published }).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function PATCH(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { id, title, slug, content, is_published } = await req.json();
    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (content !== undefined) updates.content = content;
    if (is_published !== undefined) updates.is_published = is_published;
    const { data, error } = await db.from("website_pages").update(updates).eq("id",id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const { error } = await db.from("website_pages").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
