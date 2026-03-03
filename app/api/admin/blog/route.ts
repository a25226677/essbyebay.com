import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET(request: Request) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { supabase } = context;
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();

  let query = supabase
    .from("blog_posts")
    .select("id,title,slug,is_published,published_at,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  try {
    const body = await request.json();
    const title = String(body.title || "").trim();
    const excerpt = String(body.excerpt || "").trim();
    const content = String(body.content || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }

    const { error } = await supabase.from("blog_posts").insert({
      author_id: userId,
      title,
      slug: `${slugify(title)}-${Date.now().toString().slice(-6)}`,
      excerpt: excerpt || null,
      content,
      image_url: imageUrl || null,
      is_published: false,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
