import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import type { SellerContext } from "@/lib/supabase/seller-api";
import {
  buildOwnedCatalogLookup,
} from "@/lib/seller-catalog";

type CatalogFilterInput = {
  search?: string;
  categoryId?: string;
  brandId?: string;
  page?: number;
  limit?: number;
};

type FilterOption = { id: string; name: string };

type CatalogItem = {
  id: string;
  title: string;
  sku: string;
  price: number;
  stock: number;
  image: string | null;
  category: string;
  brand: string;
  imported: false;
};

type CatalogResponse = {
  items: CatalogItem[];
  categories: FilterOption[];
  brands: FilterOption[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    baseTotal: number;
    remainingTotal: number;
    hasMore?: boolean;
    exact?: boolean;
  };
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;
const FALLBACK_SCAN_BATCH_SIZE = 250;
const FALLBACK_MAX_SCANNED_ROWS = 5000;
const FALLBACK_MAX_BATCHES = 20;

export function buildAllActiveNonOwnedFilter(userId: string) {
  return `seller_id.is.null,seller_id.neq.${userId}`;
}

function normalizeFilters(input: CatalogFilterInput) {
  const search = (input.search || "").trim();
  const categoryId = (input.categoryId || "").trim();
  const brandId = (input.brandId || "").trim();
  const page = Math.max(Number(input.page || 1), 1);
  const limit = Math.min(Math.max(Number(input.limit || DEFAULT_LIMIT), 1), MAX_LIMIT);

  return { search, categoryId, brandId, page, limit };
}

type SourceRow = {
  id: string;
  title: string;
  sku: string | null;
  price: number | null;
  stock_count: number | null;
  image_url: string | null;
  source_product_id: string | null;
  created_at: string | null;
  categories: { id: string; name: string }[] | null;
  brands: { id: string; name: string }[] | null;
};

type CatalogPageResult = {
  items: CatalogItem[];
  pagination: CatalogResponse["pagination"];
  strategy: "rpc" | "fallback";
};

function isOwnedByCanonicalSource(
  product: SourceRow,
  ownedLookup: ReturnType<typeof buildOwnedCatalogLookup>,
) {
  const canonicalSourceId = product.source_product_id?.trim() || product.id?.trim();
  if (!canonicalSourceId) return false;
  return ownedLookup.ownedSourceIds.has(canonicalSourceId);
}

function toCatalogItem(product: SourceRow): CatalogItem {
  return {
    id: product.id,
    title: product.title,
    sku: product.sku ?? "",
    price: Number(product.price ?? 0),
    stock: Number(product.stock_count ?? 0),
    image: product.image_url,
    category: product.categories?.[0]?.name ?? "Uncategorized",
    brand: product.brands?.[0]?.name ?? "",
    imported: false as const,
  };
}

function normalizeNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, numeric);
}

async function getCatalogViaRpc(
  db: ReturnType<typeof createAdminServiceClient>,
  userId: string,
  filters: ReturnType<typeof normalizeFilters>,
): Promise<CatalogPageResult | null> {
  const { search, categoryId, brandId, page, limit } = filters;

  const { data, error } = await db.rpc("seller_get_storehouse_catalog_page", {
    p_seller_id: userId,
    p_search: search || null,
    p_category_id: categoryId || null,
    p_brand_id: brandId || null,
    p_page: page,
    p_limit: limit,
  });

  if (error) {
    // Function missing means migration not deployed yet — fallback to fast in-app scanning.
    if (error.code === "42883") return null;
    throw new Error(error.message);
  }

  const payload = Array.isArray(data) ? data[0] : data;
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items = rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.title ?? ""),
      sku: String(item.sku ?? ""),
      price: Number(item.price ?? 0),
      stock: Number(item.stock ?? 0),
      image: typeof item.image === "string" ? item.image : null,
      category: String(item.category ?? "Uncategorized"),
      brand: String(item.brand ?? ""),
      imported: false as const,
    }))
    .filter((item) => item.id.length > 0);

  const rawPagination =
    record.pagination && typeof record.pagination === "object"
      ? (record.pagination as Record<string, unknown>)
      : {};

  const normalizedPage = Math.max(Math.floor(normalizeNumber(rawPagination.page, page)), 1);
  const normalizedLimit = Math.max(Math.floor(normalizeNumber(rawPagination.limit, limit)), 1);
  const normalizedTotal = Math.floor(normalizeNumber(rawPagination.total, 0));
  const normalizedPages = Math.max(
    Math.floor(
      normalizeNumber(
        rawPagination.pages,
        normalizedTotal > 0 ? Math.ceil(normalizedTotal / normalizedLimit) : 1,
      ),
    ),
    1,
  );
  const normalizedBaseTotal = Math.floor(
    normalizeNumber(rawPagination.baseTotal, normalizedTotal),
  );
  const normalizedRemainingTotal = Math.floor(
    normalizeNumber(rawPagination.remainingTotal, normalizedTotal),
  );
  const hasMore = Boolean(
    rawPagination.hasMore ?? normalizedPage * normalizedLimit < normalizedTotal,
  );
  const exact = rawPagination.exact !== false;

  return {
    items,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total: normalizedTotal,
      pages: normalizedPages,
      baseTotal: normalizedBaseTotal,
      remainingTotal: normalizedRemainingTotal,
      hasMore,
      exact,
    },
    strategy: "rpc",
  };
}

async function getCatalogViaFastFallback(
  context: SellerContext,
  db: ReturnType<typeof createAdminServiceClient>,
  filters: ReturnType<typeof normalizeFilters>,
): Promise<CatalogPageResult> {
  const { supabase, userId } = context;
  const { search, categoryId, brandId, page, limit } = filters;

  const { data: ownedProducts, error: ownedProductsError } = await supabase
    .from("products")
    .select("id,title,source_product_id")
    .eq("seller_id", userId);

  if (ownedProductsError) throw new Error(ownedProductsError.message);
  const ownedLookup = buildOwnedCatalogLookup(ownedProducts || []);

  const offset = (page - 1) * limit;
  const targetVisibleCount = offset + limit + 1;
  const visibleRows: SourceRow[] = [];

  let scanOffset = 0;
  let scannedRows = 0;
  let baseMatchedCount = 0;
  let batchCount = 0;
  let exhausted = false;

  while (
    visibleRows.length < targetVisibleCount &&
    scannedRows < FALLBACK_MAX_SCANNED_ROWS &&
    batchCount < FALLBACK_MAX_BATCHES
  ) {
    let query = db
      .from("products")
      .select(
        `id,title,sku,price,stock_count,image_url,source_product_id,created_at,categories(id,name),brands(id,name)`,
      )
      .eq("is_active", true)
      .is("source_product_id", null)
      .neq("seller_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(scanOffset, scanOffset + FALLBACK_SCAN_BATCH_SIZE - 1);

    if (search) query = query.ilike("title", `%${search}%`);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (brandId) query = query.eq("brand_id", brandId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data as SourceRow[] | null) ?? [];
    if (rows.length === 0) {
      exhausted = true;
      break;
    }

    baseMatchedCount += rows.length;

    for (const product of rows) {
      scannedRows += 1;
      if (isOwnedByCanonicalSource(product, ownedLookup)) continue;
      visibleRows.push(product);
      if (visibleRows.length >= targetVisibleCount) break;
    }

    batchCount += 1;
    scanOffset += rows.length;

    if (rows.length < FALLBACK_SCAN_BATCH_SIZE) {
      exhausted = true;
      break;
    }
  }

  const pageRows = visibleRows.slice(offset, offset + limit);
  const hasBufferedNextPage = visibleRows.length > offset + limit;
  const scanBudgetReached =
    !exhausted &&
    (scannedRows >= FALLBACK_MAX_SCANNED_ROWS || batchCount >= FALLBACK_MAX_BATCHES);
  const hasMore = hasBufferedNextPage || scanBudgetReached;

  const estimatedTotal = hasMore ? offset + pageRows.length + 1 : offset + pageRows.length;
  const estimatedBaseTotal = Math.max(baseMatchedCount, estimatedTotal);
  const estimatedPages = hasMore ? page + 1 : Math.max(page, 1);

  return {
    items: pageRows.map(toCatalogItem),
    pagination: {
      page,
      limit,
      total: estimatedTotal,
      pages: estimatedPages,
      baseTotal: estimatedBaseTotal,
      remainingTotal: estimatedTotal,
      hasMore,
      exact: false,
    },
    strategy: "fallback",
  };
}

async function getCatalogViaOpenFallback(
  db: ReturnType<typeof createAdminServiceClient>,
  userId: string,
  filters: ReturnType<typeof normalizeFilters>,
): Promise<CatalogPageResult> {
  const { search, categoryId, brandId, page, limit } = filters;
  const offset = (page - 1) * limit;

  let query = db
    .from("products")
    .select(
      `id,title,sku,price,stock_count,image_url,source_product_id,created_at,categories(id,name),brands(id,name)`,
      { count: "exact" },
    )
    .eq("is_active", true)
    .is("source_product_id", null)
    .neq("seller_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike("title", `%${search}%`);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (brandId) query = query.eq("brand_id", brandId);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = (data as SourceRow[] | null) ?? [];
  const total = Math.max(Number(count ?? 0), 0);
  const pages = total > 0 ? Math.ceil(total / limit) : 1;

  return {
    items: rows.map(toCatalogItem),
    pagination: {
      page,
      limit,
      total,
      pages,
      baseTotal: total,
      remainingTotal: total,
      hasMore: page * limit < total,
      exact: false,
    },
    strategy: "fallback",
  };
}

export async function getSellerStorehouseCatalog(
  context: SellerContext,
  input: CatalogFilterInput,
): Promise<CatalogResponse> {
  const { userId } = context;
  const db = createAdminServiceClient();
  const filters = normalizeFilters(input);
  const startedAt = Date.now();

  const [
    { data: categories, error: categoriesError },
    { data: brands, error: brandsError },
    rpcResult,
  ] = await Promise.all([
    db.from("categories").select("id,name").order("name"),
    db.from("brands").select("id,name").order("name"),
    getCatalogViaRpc(db, userId, filters),
  ]);

  if (categoriesError) throw new Error(categoriesError.message);
  if (brandsError) throw new Error(brandsError.message);

  let catalogPage: CatalogPageResult;
  if (rpcResult) {
    catalogPage = rpcResult;
    const suspiciousEmptyResult =
      filters.page === 1 &&
      rpcResult.pagination.total === 0 &&
      rpcResult.pagination.baseTotal > 0;

    if (suspiciousEmptyResult) {
      const fallbackPage = await getCatalogViaFastFallback(context, db, filters);
      if (fallbackPage.items.length > 0 || fallbackPage.pagination.total > 0) {
        catalogPage = fallbackPage;
        console.warn(
          `[seller-catalog] rpc returned empty while base pool exists; using fallback strategy`,
        );
      } else {
        const openFallbackPage = await getCatalogViaOpenFallback(db, userId, filters);
        if (openFallbackPage.items.length > 0 || openFallbackPage.pagination.total > 0) {
          catalogPage = openFallbackPage;
          console.warn(
            `[seller-catalog] rpc/fallback returned empty while base pool exists; using open fallback`,
          );
        }
      }
    }
  } else {
    catalogPage = await getCatalogViaFastFallback(context, db, filters);
  }

  const elapsedMs = Date.now() - startedAt;
  if (elapsedMs >= 700) {
    console.info(
      `[seller-catalog] strategy=${catalogPage.strategy} page=${filters.page} limit=${filters.limit} duration_ms=${elapsedMs}`,
    );
  }

  return {
    items: catalogPage.items,
    categories: categories || [],
    brands: brands || [],
    pagination: catalogPage.pagination,
  };
}
