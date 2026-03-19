import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { buildOwnedCatalogLookup, isOwnedCatalogProduct } from "@/lib/seller-catalog";
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
  const batchSize = Math.max(limit * 4, 200);

  const db = createAdminServiceClient();

  // Fetch categories, brands, seller-owned products, and base source-pool size in parallel.
  let baseCountQuery = db
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .is("shop_id", null);

  if (search) baseCountQuery = baseCountQuery.ilike("title", `%${search}%`);
  if (category_id) baseCountQuery = baseCountQuery.eq("category_id", category_id);
  if (brand_id) baseCountQuery = baseCountQuery.eq("brand_id", brand_id);

  const [{ data: categories }, { data: brands }, { data: sellerProducts }, basePoolResult] = await Promise.all([
    db.from("categories").select("id,name").order("name"),
    db.from("brands").select("id,name").order("name"),
    supabase.from("products").select("id,title,source_product_id").eq("seller_id", userId),
    baseCountQuery,
  ]);

  if (basePoolResult.error) {
    return NextResponse.json({ error: basePoolResult.error.message }, { status: 500 });
  }

  const baseTotal = Number(basePoolResult.count || 0);

  const ownedLookup = buildOwnedCatalogLookup(sellerProducts || []);

  type CatalogRow = {
    id: string;
    title: string;
    sku: string | null;
    price: number;
    stock_count: number | null;
    image_url: string | null;
    source_product_id: string | null;
    categories: { id: string; name: string }[] | null;
    brands: { id: string; name: string }[] | null;
  };

  const visibleItems: CatalogRow[] = [];
  let visibleTotal = 0;
  let scanOffset = 0;

  while (true) {
    let batchQuery = db
      .from("products")
      .select(
        `id, title, sku, price, stock_count, image_url, category_id, brand_id, source_product_id,
         categories(id, name),
         brands(id, name)`,
      )
      .eq("is_active", true)
      .is("shop_id", null)
      .order("created_at", { ascending: false })
      .range(scanOffset, scanOffset + batchSize - 1);

    if (search) batchQuery = batchQuery.ilike("title", `%${search}%`);
    if (category_id) batchQuery = batchQuery.eq("category_id", category_id);
    if (brand_id) batchQuery = batchQuery.eq("brand_id", brand_id);

    const { data: batchData, error } = await batchQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!batchData || batchData.length === 0) break;

    for (const product of batchData as CatalogRow[]) {
      if (isOwnedCatalogProduct(product, ownedLookup)) continue;

      if (visibleTotal >= offset && visibleItems.length < limit) {
        visibleItems.push(product);
      }

      visibleTotal += 1;
    }

    if (batchData.length < batchSize) break;
    scanOffset += batchData.length;
  }

  const items = visibleItems.map((p) => ({
    id: p.id,
    title: p.title,
    sku: p.sku ?? "",
    price: Number(p.price),
    stock: p.stock_count ?? 1000,
    image: p.image_url,
    category: p.categories?.[0]?.name ?? "Uncategorized",
    brand: p.brands?.[0]?.name ?? "",
    imported: false,
  }));

  return NextResponse.json({
    items,
    categories: categories || [],
    brands: brands || [],
    pagination: {
      page,
      limit,
      total: visibleTotal,
      remainingTotal: visibleTotal,
      baseTotal,
      pages: visibleTotal > 0 ? Math.ceil(visibleTotal / limit) : 1,
    },
  });
}
