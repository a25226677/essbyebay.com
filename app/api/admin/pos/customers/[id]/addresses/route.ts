import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

// GET: fetch addresses for a customer
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  const { data, error } = await db
    .from("addresses")
    .select("id, label, full_name, phone, line_1, line_2, city, state, postal_code, country, is_default")
    .eq("user_id", id)
    .order("is_default", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addresses: data || [] });
}

// POST: add a new address for a customer
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  const body = await req.json();
  const { data, error } = await db
    .from("addresses")
    .insert({ ...body, user_id: id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ address: data }, { status: 201 });
}
