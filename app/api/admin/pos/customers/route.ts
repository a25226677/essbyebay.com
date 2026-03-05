import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

// GET: List all customer profiles for POS customer selector
export async function GET() {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, phone, avatar_url, role")
    .eq("role", "customer")
    .order("full_name", { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ customers: data || [] });
}
