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
    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string") updates.title = body.title.trim();
    if (typeof body.excerpt === "string") updates.excerpt = body.excerpt.trim();
    if (typeof body.content === "string") updates.content = body.content;
    if (typeof body.imageUrl === "string") updates.image_url = body.imageUrl.trim();
    if (typeof body.isPublished === "boolean") {
      updates.is_published = body.isPublished;
      updates.published_at = body.isPublished ? new Date().toISOString() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { error } = await supabase.from("blog_posts").update(updates).eq("id", id);

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

  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
