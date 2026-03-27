import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { searchParams } = new URL(request.url);

  const search = (searchParams.get("search") || "").trim();
  const page = Math.max(Number(searchParams.get("page") || "1"), 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || "10"), 1), 50);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("products")
    .select(
      "id,title,slug,sku,price,stock_count,is_active,is_featured,is_promoted,image_url,created_at,categories(name)",
      { count: "exact" },
    )
    .eq("seller_id", userId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((p, idx) => ({
    id: p.id,
    index: (page - 1) * limit + idx + 1,
    title: p.title,
    slug: p.slug ?? "",
    sku: p.sku ?? null,
    price: Number(p.price),
    stock_count: Number(p.stock_count),
    is_active: Boolean(p.is_active),
    is_featured: Boolean(p.is_featured),
    is_promoted: Boolean(p.is_promoted),
    image_url: p.image_url ?? null,
    categories: p.categories as { name: string }[] | null,
    reason: !p.is_active ? "Inactive" : p.stock_count === 0 ? "Out of Stock" : undefined,
  }));

  return NextResponse.json({
    items,
    total: count ?? 0,
    page,
    limit,
  });
}

