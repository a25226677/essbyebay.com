import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

    const { db } = context;

  const { data, error } = await db
    .from("banners")
    .select("id,title,subtitle,image_url,link,button_text,sort_order,is_active,starts_at,ends_at")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { db } = context;

  try {
    const body = await request.json();

    const payload = {
      title: String(body.title || "").trim(),
      subtitle: String(body.subtitle || "").trim() || null,
      image_url: String(body.imageUrl || "").trim(),
      link: String(body.link || "/search").trim(),
      button_text: String(body.buttonText || "Shop Now").trim(),
      sort_order: Number(body.sortOrder || 0),
      is_active: Boolean(body.isActive ?? true),
      starts_at: body.startsAt || null,
      ends_at: body.endsAt || null,
    };

    if (!payload.title || !payload.image_url) {
      return NextResponse.json(
        { error: "Title and image URL are required" },
        { status: 400 },
      );
    }

    const { error } = await db.from("banners").insert(payload);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
