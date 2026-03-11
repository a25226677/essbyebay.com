import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function buildUniqueImportSku(
  db: ReturnType<typeof createAdminServiceClient>,
  originalSku: string | null,
  userId: string,
  reservedSkus: Set<string>,
) {
  const baseSku = originalSku?.trim();
  if (!baseSku) return null;

  const sellerSuffix = userId.slice(0, 6).toUpperCase();
  const candidateBase = `${baseSku}-${sellerSuffix}`;
  let candidate = candidateBase;
  let attempt = 2;

  while (reservedSkus.has(candidate)) {
    candidate = `${candidateBase}-${attempt}`;
    attempt += 1;
  }

  while (true) {
    const { data: existingSku, error } = await db
      .from("products")
      .select("id")
      .eq("sku", candidate)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!existingSku) break;

    candidate = `${candidateBase}-${attempt}`;
    attempt += 1;
    while (reservedSkus.has(candidate)) {
      candidate = `${candidateBase}-${attempt}`;
      attempt += 1;
    }
  }

  reservedSkus.add(candidate);
  return candidate;
}

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;
  const { supabase, userId } = context;

  const body = await request.json();
  // product_ids: string[] to import
  const { product_ids } = body as { product_ids: string[] };

  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return NextResponse.json({ error: "product_ids array is required" }, { status: 400 });
  }

  // Max batch size guard
  if (product_ids.length > 200) {
    return NextResponse.json({ error: "Too many products in one request (max 200)" }, { status: 400 });
  }

  // Resolve seller's shop, creating one if needed
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!shop) {
    return NextResponse.json({ error: "You must have a shop to import products" }, { status: 400 });
  }
  const shopId = shop.id;

  // Fetch source products from admin catalog
  const db = createAdminServiceClient();
  const { data: sourceProducts, error: fetchError } = await db
    .from("products")
    .select("id,title,sku,price,stock_count,image_url,category_id,brand_id,description,source_product_id")
    .in("id", product_ids)
    .eq("is_active", true);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!sourceProducts || sourceProducts.length === 0) {
    return NextResponse.json({ error: "No matching products found" }, { status: 404 });
  }

  // Check which canonical source products the seller already has.
  const { data: existing } = await supabase
    .from("products")
    .select("title,source_product_id")
    .eq("seller_id", userId);

  const existingTitles = new Set((existing || []).map((e) => e.title));
  const existingSourceIds = new Set(
    (existing || [])
      .map((e) => e.source_product_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const reservedSkus = new Set<string>();
  const importableProducts = sourceProducts.filter((p) => {
    const canonicalSourceId = p.source_product_id ?? p.id;
    return !existingSourceIds.has(canonicalSourceId) && !existingTitles.has(p.title);
  });
  const toInsert = await Promise.all(
    importableProducts.map(async (p, index) => {
      const slug = slugify(p.title) || `product-${Date.now()}`;
      const canonicalSourceId = p.source_product_id ?? p.id;
      return {
        seller_id: userId,
        shop_id: shopId,
        category_id: p.category_id,
        brand_id: p.brand_id,
        title: p.title,
        slug: `${slug}-${(Date.now() + index).toString().slice(-6)}`,
        sku: await buildUniqueImportSku(db, p.sku ?? null, userId, reservedSkus),
        description: p.description ?? null,
        price: p.price,
        stock_count: p.stock_count ?? 1000,
        image_url: p.image_url ?? null,
        is_active: true,
        source_product_id: canonicalSourceId,
      };
    }),
  );

  if (toInsert.length === 0) {
    return NextResponse.json({ success: true, imported: 0, skipped: sourceProducts.length, message: "All selected products already exist in your shop" });
  }

  const { error: insertError } = await supabase.from("products").insert(toInsert);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    imported: toInsert.length,
    skipped: sourceProducts.length - toInsert.length,
  });
}
