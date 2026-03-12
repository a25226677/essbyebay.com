import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
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
  const normalizedSearch = search.trim();
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = db
    .from("products")
    .select(
      "id,title,sku,price,stock_count,image_url,category_id,brand_id,description,source_product_id",
    )
    .eq("is_active", true)
    .neq("seller_id", userId)
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

  // Targeted dedup — only the IDs in this page, never a full-table scan.
  const candidateSourceIds = sourceProducts.map((p) => p.source_product_id ?? p.id);
  const { data: alreadyOwned } = await supabase
    .from("products")
    .select("source_product_id")
    .eq("seller_id", userId)
    .in("source_product_id", candidateSourceIds);

  const ownedSet = new Set(
    (alreadyOwned || []).map((p) => p.source_product_id as string),
  );

  const reservedSlugs = new Set<string>();
  const reservedSkus = new Set<string>();

  const toInsert = sourceProducts
    .filter((p) => {
      const canonicalSourceId = p.source_product_id ?? p.id;
      return !ownedSet.has(canonicalSourceId);
    })
    .map((p) => {
      const canonicalSourceId = p.source_product_id ?? p.id;
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
