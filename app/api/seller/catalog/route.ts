import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verify seller is authenticated
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;
  const { supabase, userId } = context;

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();
  const category_id = searchParams.get("category_id") || "";
  const brand_id = searchParams.get("brand_id") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10));
  const offset = (page - 1) * limit;

  const db = createAdminServiceClient();

  let query = db
    .from("products")
    .select(
      `id, title, sku, price, stock_count, image_url, category_id, brand_id,
       categories(id, name),
       brands(id, name)`,
      { count: "exact" },
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (search) query = query.ilike("title", `%${search}%`);
  if (category_id) query = query.eq("category_id", category_id);
  if (brand_id) query = query.eq("brand_id", brand_id);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch categories, brands, and seller's already-imported product titles in parallel
  const [{ data: categories }, { data: brands }, { data: sellerProducts }] = await Promise.all([
    db.from("categories").select("id,name").order("name"),
    db.from("brands").select("id,name").order("name"),
    supabase.from("products").select("title").eq("seller_id", userId),
  ]);

  const importedTitles = new Set((sellerProducts || []).map((p) => p.title));

  const items = (data || []).map((p) => ({
    id: p.id,
    title: p.title,
    sku: p.sku ?? "",
    price: Number(p.price),
    stock: p.stock_count ?? 1000,
    image: p.image_url,
    category: (p.categories as unknown as { id: string; name: string } | null)?.name ?? "Uncategorized",
    brand: (p.brands as unknown as { id: string; name: string } | null)?.name ?? "",
    imported: importedTitles.has(p.title),
  }));

  return NextResponse.json({
    items,
    categories: categories || [],
    brands: brands || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  });
}
