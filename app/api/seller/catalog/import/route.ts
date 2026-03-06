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
    .select("title,sku,price,stock_count,image_url,category_id,brand_id,description")
    .in("id", product_ids)
    .eq("is_active", true);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!sourceProducts || sourceProducts.length === 0) {
    return NextResponse.json({ error: "No matching products found" }, { status: 404 });
  }

  // Check which products the seller already has (by title + shop to avoid duplicates)
  const titles = sourceProducts.map((p) => p.title);
  const { data: existing } = await supabase
    .from("products")
    .select("title")
    .eq("seller_id", userId)
    .in("title", titles);

  const existingTitles = new Set((existing || []).map((e) => e.title));

  const toInsert = sourceProducts
    .filter((p) => !existingTitles.has(p.title))
    .map((p) => {
      const slug = slugify(p.title) || `product-${Date.now()}`;
      return {
        seller_id: userId,
        shop_id: shopId,
        category_id: p.category_id,
        brand_id: p.brand_id,
        title: p.title,
        slug: `${slug}-${Date.now().toString().slice(-6)}`,
        sku: p.sku ?? null,
        description: p.description ?? null,
        price: p.price,
        stock_count: p.stock_count ?? 1000,
        image_url: p.image_url ?? null,
        is_active: true,
      };
    });

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
