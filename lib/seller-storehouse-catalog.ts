import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import type { SellerContext } from "@/lib/supabase/seller-api";
import {
  buildOwnedCatalogLookup,
  getCanonicalSourceProductId,
  isOwnedCatalogProduct,
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
  };
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;

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

export async function getSellerStorehouseCatalog(
  context: SellerContext,
  input: CatalogFilterInput,
): Promise<CatalogResponse> {
  const { supabase, userId } = context;
  const db = createAdminServiceClient();
  const { search, categoryId, brandId, page, limit } = normalizeFilters(input);

  const offset = (page - 1) * limit;
  const batchSize = Math.max(limit * 4, 200);

  const [
    { data: categories, error: categoriesError },
    { data: brands, error: brandsError },
    { data: ownedProducts, error: ownedProductsError },
  ] = await Promise.all([
    db.from("categories").select("id,name").order("name"),
    db.from("brands").select("id,name").order("name"),
    supabase.from("products").select("id,title,source_product_id").eq("seller_id", userId),
  ]);

  if (categoriesError) throw new Error(categoriesError.message);
  if (brandsError) throw new Error(brandsError.message);
  if (ownedProductsError) throw new Error(ownedProductsError.message);

  const ownedLookup = buildOwnedCatalogLookup(ownedProducts || []);

  type SourceRow = {
    id: string;
    title: string;
    sku: string | null;
    price: number | null;
    stock_count: number | null;
    image_url: string | null;
    source_product_id: string | null;
    categories: { id: string; name: string }[] | null;
    brands: { id: string; name: string }[] | null;
  };

  const seenCanonicalSourceIds = new Set<string>();
  const visibleRows: SourceRow[] = [];
  let visibleTotal = 0;
  let baseTotal = 0;
  let scanOffset = 0;

  while (true) {
    let query = db
      .from("products")
      .select(
        `id,title,sku,price,stock_count,image_url,source_product_id,categories(id,name),brands(id,name)`,
      )
      .eq("is_active", true)
      .or(buildAllActiveNonOwnedFilter(userId))
      .order("created_at", { ascending: false })
      .range(scanOffset, scanOffset + batchSize - 1);

    if (search) query = query.ilike("title", `%${search}%`);
    if (categoryId) query = query.eq("category_id", categoryId);
    if (brandId) query = query.eq("brand_id", brandId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const product of data as SourceRow[]) {
      const canonicalSourceId = getCanonicalSourceProductId(product) || product.id;
      if (!canonicalSourceId || seenCanonicalSourceIds.has(canonicalSourceId)) {
        continue;
      }

      seenCanonicalSourceIds.add(canonicalSourceId);
      baseTotal += 1;

      if (isOwnedCatalogProduct(product, ownedLookup)) {
        continue;
      }

      if (visibleTotal >= offset && visibleRows.length < limit) {
        visibleRows.push(product);
      }
      visibleTotal += 1;
    }

    if (data.length < batchSize) break;
    scanOffset += data.length;
  }

  const items = visibleRows.map((product) => ({
    id: product.id,
    title: product.title,
    sku: product.sku ?? "",
    price: Number(product.price ?? 0),
    stock: Number(product.stock_count ?? 0),
    image: product.image_url,
    category: product.categories?.[0]?.name ?? "Uncategorized",
    brand: product.brands?.[0]?.name ?? "",
    imported: false as const,
  }));

  return {
    items,
    categories: categories || [],
    brands: brands || [],
    pagination: {
      page,
      limit,
      total: visibleTotal,
      pages: visibleTotal > 0 ? Math.ceil(visibleTotal / limit) : 1,
      baseTotal,
      remainingTotal: visibleTotal,
    },
  };
}
