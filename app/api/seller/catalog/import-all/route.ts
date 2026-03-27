import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { buildOwnedCatalogLookup, getCanonicalSourceProductId, isOwnedCatalogProduct } from "@/lib/seller-catalog";
import { NextResponse } from "next/server";

// Each request handles one page — keeps every DB query well under the statement timeout.
const PAGE_SIZE = 50;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function ensureSellerShopId(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
) {
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (shop?.id) return shop.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  const baseName = profile?.full_name?.trim() || "My Shop";
  const baseSlug = slugify(baseName) || `shop-${userId.slice(0, 8)}`;

  const { data: created, error } = await supabase
    .from("shops")
    .insert({
      owner_id: userId,
      name: baseName,
      slug: `${baseSlug}-${Date.now().toString().slice(-6)}`,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id;
}

function buildImportSlug(
  title: string,
  sellerId: string,
  canonicalSourceId: string,
  reservedSlugs: Set<string>,
) {
  const baseSlug = slugify(title) || "product";
  const sellerSuffix = sellerId.replace(/-/g, "").slice(0, 8).toLowerCase();
  const sourceSuffix = canonicalSourceId.replace(/-/g, "").slice(0, 10).toLowerCase();
  const candidateBase = `${baseSlug}-${sellerSuffix}-${sourceSuffix}`;
  let candidate = candidateBase;
  let attempt = 2;
  while (reservedSlugs.has(candidate)) {
    candidate = `${candidateBase}-${attempt}`;
    attempt += 1;
  }
  reservedSlugs.add(candidate);
  return candidate;
}

function buildImportSku(
  originalSku: string | null,
  sellerId: string,
  canonicalSourceId: string,
  reservedSkus: Set<string>,
) {
  const baseSku = originalSku?.trim();
  if (!baseSku) return null;
  const sellerSuffix = sellerId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const sourceSuffix = canonicalSourceId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const candidateBase = `${baseSku}-${sellerSuffix}-${sourceSuffix}`;
  let candidate = candidateBase;
  let attempt = 2;
  while (reservedSkus.has(candidate)) {
    candidate = `${candidateBase}-${attempt}`;
    attempt += 1;
  }
  reservedSkus.add(candidate);
  return candidate;
}

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;
  const { supabase, userId } = context;

  const body = await request.json();
  const { search = "", category_id = null, brand_id = null, page = 0 } = body as {
    search?: string;
    category_id?: string | null;
    brand_id?: string | null;
    page?: number;
  };

  // Resolve seller's shop, creating one if needed
  let shopId: string;
  try {
    shopId = await ensureSellerShopId(supabase, userId);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Failed to resolve shop" }, { status: 500 });
  }

  const db = createAdminServiceClient();
  const normalizedSearch = search.trim();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = db
    .from("products")
    .select(
      "id,title,sku,price,stock_count,image_url,category_id,brand_id,description,source_product_id",
    )
    .eq("is_active", true)
    .is("shop_id", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (normalizedSearch) query = query.ilike("title", `%${normalizedSearch}%`);
  if (category_id) query = query.eq("category_id", category_id);
  if (brand_id) query = query.eq("brand_id", brand_id);

  const { data: sourceProducts, error: sourceError } = await query;
  if (sourceError) {
    console.error("seller catalog import-all source fetch failed", sourceError);
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }

  if (!sourceProducts || sourceProducts.length === 0) {
    return NextResponse.json({ imported: 0, skipped: 0, hasMore: false });
  }

  const { data: alreadyOwned } = await supabase
    .from("products")
    .select("id,title,source_product_id")
    .eq("seller_id", userId);

  const ownedLookup = buildOwnedCatalogLookup(alreadyOwned || []);

  const reservedSlugs = new Set<string>();
  const reservedSkus = new Set<string>();

  const toInsert = sourceProducts
    .filter((p) => {
      return !isOwnedCatalogProduct(p, ownedLookup);
    })
    .map((p) => {
      const canonicalSourceId = getCanonicalSourceProductId(p) || p.id;
      return {
        seller_id: userId,
        shop_id: shopId,
        category_id: p.category_id,
        brand_id: p.brand_id,
        title: p.title,
        slug: buildImportSlug(p.title, userId, canonicalSourceId, reservedSlugs),
        sku: buildImportSku(p.sku ?? null, userId, canonicalSourceId, reservedSkus),
        description: p.description ?? null,
        price: p.price,
        stock_count: p.stock_count ?? 1000,
        image_url: p.image_url ?? null,
        is_active: true,
        source_product_id: canonicalSourceId,
      };
    });

  const skipped = sourceProducts.length - toInsert.length;
  let imported = 0;

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("products").insert(toInsert);
    if (insertError) {
      console.error("seller catalog import-all insert failed", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    imported = toInsert.length;
  }

  return NextResponse.json({
    imported,
    skipped,
    hasMore: sourceProducts.length === PAGE_SIZE,
    nextPage: page + 1,
  });
}
