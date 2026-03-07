import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/** Public-facing brands list (no admin auth required). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const search = (request.nextUrl.searchParams.get("search") || "").trim();

  let query = supabase
    .from("brands")
    .select("id, name, slug, logo_url")
    .order("name", { ascending: true });

  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
