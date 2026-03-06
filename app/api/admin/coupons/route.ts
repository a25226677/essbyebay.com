import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAdminContext();
    if (ctx instanceof NextResponse) return ctx;
    const { db } = ctx;

    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") || "").trim();
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
    const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
    const offset = (page - 1) * limit;

    let query = db
      .from("coupons")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) query = query.ilike("code", `%${search}%`);
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      items: data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAdminContext();
    if (ctx instanceof NextResponse) return ctx;
    const { db } = ctx;

    const body = await req.json();
    const { code, discount_type, discount_value, min_order_amount, max_uses, expires_at } = body;

    if (!code || !discount_value) {
      return NextResponse.json({ error: "Code and discount value are required" }, { status: 400 });
    }

    const { data, error } = await db
      .from("coupons")
      .insert({
        code: code.toUpperCase().trim(),
        discount_type: discount_type || "percentage",
        discount_value,
        min_order_amount: min_order_amount || 0,
        max_uses: max_uses || 100,
        expires_at: expires_at || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getAdminContext();
    if (ctx instanceof NextResponse) return ctx;
    const { db } = ctx;

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (updates.code) updates.code = updates.code.toUpperCase().trim();

    const { data, error } = await db
      .from("coupons")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ item: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getAdminContext();
    if (ctx instanceof NextResponse) return ctx;
    const { db } = ctx;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { error } = await db.from("coupons").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
