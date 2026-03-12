import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** Public-facing brands list (no admin auth required). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const search = (request.nextUrl.searchParams.get("search") || "").trim();
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(request.nextUrl.searchParams.get("limit") || "50", 10));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("brands")
    .select("id, name, slug, logo_url", { count: "exact" })
    .order("name", { ascending: true });

  if (search) query = query.ilike("name", `%${search}%`);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    items: data || [],
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}
