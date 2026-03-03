import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const search = (sp.get("search") || "").trim();
  const is_verified = sp.get("is_verified") || "";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("shops")
    .select(
      `id, name, slug, logo_url, banner_url, description, is_verified, rating,
       product_count, created_at,
       profiles!shops_owner_id_fkey(id, full_name, phone, is_active)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("name", `%${search}%`);
  if (is_verified !== "") query = query.eq("is_verified", is_verified === "true");

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data || [],
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const body = await request.json();
  const { data, error } = await db.from("shops").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
