import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const search = (sp.get("search") || "").trim();
  const category_id = sp.get("category_id") || "";
  const seller_id = sp.get("seller_id") || "";
  const is_active = sp.get("is_active") || "";
  const stock = sp.get("stock") || ""; // "in_stock" | "low_stock" | "out_of_stock"
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("products")
    .select(
      `id, title, slug, sku, price, compare_at_price, stock_count, image_url,
       is_active, rating, review_count, created_at,
       categories(id, name),
       brands(id, name),
       shops(id, name, slug)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("title", `%${search}%`);
  if (category_id) query = query.eq("category_id", category_id);
  if (seller_id) query = query.eq("seller_id", seller_id);
  if (is_active !== "") query = query.eq("is_active", is_active === "true");
  if (stock === "out_of_stock") query = query.eq("stock_count", 0);
  else if (stock === "low_stock") query = query.gt("stock_count", 0).lte("stock_count", 10);
  else if (stock === "in_stock") query = query.gt("stock_count", 10);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data || [],
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const body = await request.json();
  const { data, error } = await db.from("products").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
