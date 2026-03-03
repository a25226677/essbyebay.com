import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  const body = await request.json();
  const { error } = await db.from("categories").update(body).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
