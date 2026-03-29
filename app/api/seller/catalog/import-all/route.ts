import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

const IMPORT_BATCH_SIZE = 200;

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
      return NextResponse.json(
        {
          error:
            "Database migration missing for batched import-all. Run latest Supabase migrations and retry.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = Array.isArray(data) ? data[0] : null;
  const imported = Number(result?.imported_count ?? 0);
  const skipped = Number(result?.skipped_count ?? 0);
  const attempted = Number(result?.attempted_count ?? imported + skipped);
  const hasMore = Boolean(result?.has_more) && attempted > 0;

  return NextResponse.json({
    success: true,
    imported,
    skipped,
    attempted,
    hasMore,
  });
}
