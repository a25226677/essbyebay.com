import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { supabase } = context;
  const { id } = await params;

  try {
    const body = await request.json();

    const updates: Record<string, unknown> = {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      subtitle:
        typeof body.subtitle === "string" ? body.subtitle.trim() || null : undefined,
      image_url:
        typeof body.imageUrl === "string" ? body.imageUrl.trim() : undefined,
      link: typeof body.link === "string" ? body.link.trim() : undefined,
      button_text:
        typeof body.buttonText === "string" ? body.buttonText.trim() : undefined,
      sort_order: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      is_active: typeof body.isActive === "boolean" ? body.isActive : undefined,
      starts_at: body.startsAt === null || typeof body.startsAt === "string" ? body.startsAt : undefined,
      ends_at: body.endsAt === null || typeof body.endsAt === "string" ? body.endsAt : undefined,
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) delete updates[key];
    });

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { error } = await supabase.from("banners").update(updates).eq("id", id);

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

  const { supabase } = context;
  const { id } = await params;

  const { error } = await supabase.from("banners").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
