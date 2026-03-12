import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext();
    if (_ctx instanceof NextResponse) return _ctx;
    const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
    const offset = (page - 1) * limit;

    const { data, error, count } = await db
      .from("website_pages")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error && error.code === "PGRST116") {
      // Table doesn't exist yet
      return NextResponse.json({
        data: [],
        pagination: { page: 1, limit: 0, total: 0, pages: 0 },
      });
    }
    if (error) throw error;
    return NextResponse.json({
      data: data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (e: any) {
    return NextResponse.json({ data: [], pagination: { page: 1, limit: 0, total: 0, pages: 0 } });
  }
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
