import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";

export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext();
    if (_ctx instanceof NextResponse) return _ctx;
    const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
    const offset = (page - 1) * limit;

    const { data, error, count } = await db
      .from("payment_methods")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return NextResponse.json({
      data,
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const body = await req.json();
    const { heading, logo_url } = body;
    if (!heading) return NextResponse.json({ error: "Heading required" }, { status: 400 });
    const { data, error } = await db
      .from("payment_methods")
      .insert({ heading, logo_url: logo_url || null })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const body = await req.json();
    const { id, heading, logo_url, is_active } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const updates: any = { updated_at: new Date().toISOString() };
    if (heading !== undefined) updates.heading = heading;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await db
      .from("payment_methods")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const { error } = await db.from("payment_methods").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
