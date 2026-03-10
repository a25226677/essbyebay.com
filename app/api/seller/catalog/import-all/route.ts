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

const BATCH_SIZE = 100;

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;
  const { supabase, userId } = context;

  const body = await request.json();
  const { search = "", category_id = "", brand_id = "" } = body as {
    search?: string;
    category_id?: string;
    brand_id?: string;
  };

  // Resolve seller's shop
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!shop) {
    return NextResponse.json({ error: "You must have a shop to import products" }, { status: 400 });
  }
  const shopId = shop.id;

  const db = createAdminServiceClient();

  // Fetch ALL matching catalog products in one query (admin client bypasses RLS — safe here)
  let query = db
    .from("products")
    .select("id, title, sku, price, stock_count, image_url, category_id, brand_id, description")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);
  if (category_id) query = query.eq("category_id", category_id);
  if (brand_id) query = query.eq("brand_id", brand_id);

  const { data: allCatalog, error: fetchError } = await query;
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!allCatalog || allCatalog.length === 0) {
    return NextResponse.json({ success: true, imported: 0, skipped: 0 });
  }

  // Fetch all titles the seller already owns
  const { data: existing } = await supabase
    .from("products")
    .select("title")
    .eq("seller_id", userId);

  const existingTitles = new Set((existing || []).map((e) => e.title));

  const importable = allCatalog.filter((p) => !existingTitles.has(p.title));
  const skipped = allCatalog.length - importable.length;

  if (importable.length === 0) {
    return NextResponse.json({ success: true, imported: 0, skipped });
  }

  // Build rows — use a simple suffix to avoid SKU collisions without N DB round-trips
  const sellerSuffix = userId.slice(0, 6).toUpperCase();
  const now = Date.now();
  const reservedSkus = new Set<string>();

  const toInsert = importable.map((p, index) => {
    const slug = slugify(p.title) || `product-${now + index}`;
    let sku: string | null = null;
    if (p.sku?.trim()) {
      let candidate = `${p.sku.trim()}-${sellerSuffix}`;
      let attempt = 2;
      while (reservedSkus.has(candidate)) {
        candidate = `${p.sku.trim()}-${sellerSuffix}-${attempt++}`;
      }
      reservedSkus.add(candidate);
      sku = candidate;
    }
    return {
      seller_id: userId,
      shop_id: shopId,
      category_id: p.category_id,
      brand_id: p.brand_id,
      title: p.title,
      slug: `${slug}-${(now + index).toString().slice(-8)}`,
      sku,
      description: p.description ?? null,
      price: p.price,
      stock_count: p.stock_count ?? 1000,
      image_url: p.image_url ?? null,
      is_active: true,
    };
  });

  // Insert in batches to stay within Supabase row limits
  let totalInserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase.from("products").insert(batch);
    if (insertError) {
      // Return partial success info if some batches already went through
      return NextResponse.json(
        { error: insertError.message, imported: totalInserted, skipped },
        { status: 500 },
      );
    }
    totalInserted += batch.length;
  }

  return NextResponse.json({ success: true, imported: totalInserted, skipped });
}
