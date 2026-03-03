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

    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (typeof body.isActive === "boolean") updates.is_active = body.isActive;
    if (typeof body.price === "number") updates.price = body.price;
    if (typeof body.stock_count === "number") updates.stock_count = body.stock_count;
    if (typeof body.stockCount === "number") updates.stock_count = body.stockCount;
    if (typeof body.title === "string") updates.title = body.title;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { error } = await db.from("products").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

  const { error } = await db.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
