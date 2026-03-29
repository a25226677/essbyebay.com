import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

const IMPORT_BATCH_SIZE = 200;
const FALLBACK_SCAN_CHUNK_SIZE = 500;
const FALLBACK_MAX_SCANNED_ROWS = 10000;

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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type SourceRootRow = {
  id: string;
  title: string;
  sku: string | null;
  price: number | null;
  stock_count: number | null;
  image_url: string | null;
  category_id: string | null;
  brand_id: string | null;
  description: string | null;
  created_at: string | null;
};

function compactSlug(value: string) {
  return slugify(value).slice(0, 120) || "product";
}

function buildImportSlug(title: string, userId: string, sourceId: string) {
  const sellerToken = userId.replace(/-/g, "").toLowerCase();
  const sourceToken = sourceId.replace(/-/g, "").toLowerCase();
  return `${compactSlug(title)}-${sellerToken}-${sourceToken}`;
}

function buildImportSku(rawSku: string | null, userId: string, sourceId: string) {
  const base = rawSku?.trim();
  if (!base) return null;
  const sellerToken = userId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const sourceToken = sourceId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${base.slice(0, 40)}-${sellerToken}-${sourceToken}`;
}

async function fetchOwnedSourceIds(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
) {
  const owned = new Set<string>();
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("source_product_id")
      .eq("seller_id", userId)
      .not("source_product_id", "is", null)
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const row of rows) {
      if (typeof row.source_product_id === "string" && row.source_product_id.length > 0) {
        owned.add(row.source_product_id);
      }
    }

    if (rows.length < pageSize) break;
    offset += rows.length;
  }

  return owned;
}

async function runJsFallbackBatchImport(params: {
  db: ReturnType<typeof createAdminServiceClient>;
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;
  userId: string;
  shopId: string;
  search: string;
  categoryId: string | null;
  brandId: string | null;
}) {
  const { db, supabase, userId, shopId, search, categoryId, brandId } = params;
  const ownedSourceIds = await fetchOwnedSourceIds(supabase, userId);

  const selected: SourceRootRow[] = [];
  let scanOffset = 0;
  let scanned = 0;
  let exhausted = false;

  while (
    selected.length < IMPORT_BATCH_SIZE + 1 &&
    scanned < FALLBACK_MAX_SCANNED_ROWS
  ) {
    let query = db
      .from("products")
      .select(
        "id,title,sku,price,stock_count,image_url,category_id,brand_id,description,created_at",
      )
      .eq("is_active", true)
      .is("source_product_id", null)
      .neq("seller_id", userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(scanOffset, scanOffset + FALLBACK_SCAN_CHUNK_SIZE - 1);

    if (search) query = query.ilike("title", `%${search}%`);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (brandId) query = query.eq("brand_id", brandId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data as SourceRootRow[] | null) ?? [];
    if (rows.length === 0) {
      exhausted = true;
      break;
    }

    for (const row of rows) {
      scanned += 1;
      if (!row.id || ownedSourceIds.has(row.id)) continue;
      selected.push(row);
      if (selected.length >= IMPORT_BATCH_SIZE + 1) break;
    }

    scanOffset += rows.length;
    if (rows.length < FALLBACK_SCAN_CHUNK_SIZE) {
      exhausted = true;
      break;
    }
  }

  const batch = selected.slice(0, IMPORT_BATCH_SIZE);
  if (batch.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      attempted: 0,
      hasMore: false,
    };
  }

  const payload = batch.map((row) => ({
    seller_id: userId,
    shop_id: shopId,
    category_id: row.category_id,
    brand_id: row.brand_id,
    title: row.title,
    slug: buildImportSlug(row.title, userId, row.id),
    sku: buildImportSku(row.sku, userId, row.id),
    description: row.description,
    price: Number(row.price ?? 0),
    stock_count: Number(row.stock_count ?? 1000),
    image_url: row.image_url,
    is_active: true,
    source_product_id: row.id,
  }));

  const { data: upserted, error: upsertError } = await supabase
    .from("products")
    .upsert(payload, {
      onConflict: "seller_id,source_product_id",
      ignoreDuplicates: true,
    })
    .select("id");

  if (upsertError) throw new Error(upsertError.message);

  const imported = Array.isArray(upserted) ? upserted.length : 0;
  const attempted = batch.length;
  const skipped = Math.max(attempted - imported, 0);
  const hasMore =
    selected.length > IMPORT_BATCH_SIZE ||
    (!exhausted && scanned >= FALLBACK_MAX_SCANNED_ROWS);

  return { imported, skipped, attempted, hasMore };
}

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;
  const { supabase, userId } = context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = (body ?? {}) as {
    search?: unknown;
    category_id?: unknown;
    brand_id?: unknown;
  };

  const search = typeof payload.search === "string" ? payload.search.trim() : "";
  const categoryIdRaw =
    typeof payload.category_id === "string" ? payload.category_id.trim() : null;
  const brandIdRaw =
    typeof payload.brand_id === "string" ? payload.brand_id.trim() : null;
  const categoryId = categoryIdRaw || null;
  const brandId = brandIdRaw || null;

  if (categoryId && !isUuid(categoryId)) {
    return NextResponse.json(
      { error: "Invalid category_id. Expected UUID." },
      { status: 400 },
    );
  }

  if (brandId && !isUuid(brandId)) {
    return NextResponse.json(
      { error: "Invalid brand_id. Expected UUID." },
      { status: 400 },
    );
  }

  // Resolve seller's shop, creating one if needed
  let shopId: string;
  try {
    shopId = await ensureSellerShopId(supabase, userId);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "Failed to resolve shop" }, { status: 500 });
  }

  const db = createAdminServiceClient();
  const { data, error } = await db.rpc("seller_import_catalog_products_batch", {
    p_seller_id: userId,
    p_shop_id: shopId,
    p_search: search.length > 0 ? search : null,
    p_category_id: categoryId,
    p_brand_id: brandId,
    p_limit: IMPORT_BATCH_SIZE,
  });

  if (error) {
    console.error("seller catalog import-all batch rpc failed", error);
    if (error.code === "42883") {
      try {
        const fallback = await runJsFallbackBatchImport({
          db,
          supabase,
          userId,
          shopId,
          search,
          categoryId,
          brandId,
        });
        return NextResponse.json({ success: true, ...fallback, fallback: true });
      } catch (fallbackErr) {
        return NextResponse.json(
          {
            error:
              fallbackErr instanceof Error
                ? fallbackErr.message
                : "Fallback import failed",
          },
          { status: 500 },
        );
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : null;
  const imported = Number(result?.imported_count ?? 0);
  const skipped = Number(result?.skipped_count ?? 0);
  const attempted = Number(result?.attempted_count ?? imported + skipped);
  const hasMore = Boolean(result?.has_more) && attempted > 0;

  if (attempted === 0) {
    try {
      const fallback = await runJsFallbackBatchImport({
        db,
        supabase,
        userId,
        shopId,
        search,
        categoryId,
        brandId,
      });
      if (fallback.attempted > 0) {
        return NextResponse.json({ success: true, ...fallback, fallback: true });
      }
    } catch (fallbackErr) {
      console.error("seller catalog import-all fallback failed", fallbackErr);
    }
  }

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    attempted,
    hasMore,
  });
}
