import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.slug === "string") updates.slug = body.slug.trim();
    if (typeof body.logo_url === "string") updates.logo_url = body.logo_url.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { error } = await db.from("brands").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  const { error } = await db.from("brands").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
