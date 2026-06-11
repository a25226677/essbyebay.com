import { createClient } from "@supabase/supabase-js";
import type { BlogPost, Brand, Category, FlashDeal, Product, Shop } from "@/lib/types";

const DEFAULT_PRODUCT_IMAGE = "/images/placeholders/product-1.svg";
const DEFAULT_CATEGORY_IMAGE = "/images/placeholders/computers.svg";
const DEFAULT_BRAND_LOGO = "/images/placeholders/brand-apple.svg";
const DEFAULT_SHOP_BANNER = "/images/placeholders/hero-1.svg";
const DEFAULT_SHOP_LOGO = "/images/placeholders/logo-footer.svg";

// Public read-only client — uses the publishable (anon) key so PostgREST applies
// the standard RLS policies.  Active products are readable by anyone per the
// "products_public_read_active" policy (is_active = true).
// Call this inside each function (never cache globally across requests).
function createStorefrontClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link: string;
  button_text: string;
};

type ProductRow = {
  id: string;
  category_id?: string | null;
  brand_id?: string | null;
  title: string;
  slug: string;
  price: number | string;
  compare_at_price: number | string | null;
  image_url: string | null;
  description?: string | null;
  sku: string | null;
  stock_count: number;
  rating: number | string;
  review_count: number;
  categories?: { name: string; slug: string } | { name: string; slug: string }[] | null;
  brands?: { name: string } | { name: string }[] | null;
  shops?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    rating: number | string;
    product_count: number;
  } | {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    rating: number | string;
    product_count: number;
  }[] | null;
};

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] || null) : value;
}

function toNumber(value: number | string | null | undefined, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function getActiveBannerSlides() {
  const supabase = createStorefrontClient();

  const { data: rows, error } = await supabase
    .from("banners")
    .select("id,title,subtitle,image_url,link,button_text")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(10);

  if (error) console.error("[storefront] banners query error:", error.message);

  return ((rows || []) as BannerRow[])
    .filter((row) => row.image_url?.startsWith("http") || row.image_url?.startsWith("/"))
    .map((row) => ({
      id: row.id,
      image: row.image_url,
      title: row.title,
      subtitle: row.subtitle || "",
      link: row.link,
      buttonText: row.button_text,
    }));
}

function rowToProduct(
  row: ProductRow,
  catMap?: Map<string, { name: string; slug: string }>,
  brandMap?: Map<string, { name: string }>,
): Product {
  // Resolve category/brand either from embedded join data or from lookup maps
  const catFromJoin = pickRelation(row.categories);
  const brandFromJoin = pickRelation(row.brands);
  const shop = pickRelation(row.shops);

  const catLookup = row.category_id ? catMap?.get(row.category_id) : undefined;
  const brandLookup = row.brand_id ? brandMap?.get(row.brand_id) : undefined;

  const categorySlug = catFromJoin?.slug ?? catLookup?.slug ?? "uncategorized";
  const categoryName = catFromJoin?.name ?? catLookup?.name ?? "Uncategorized";
  const brandName = brandFromJoin?.name ?? brandLookup?.name ?? "No Brand";

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    price: toNumber(row.price),
    originalPrice: row.compare_at_price !== null ? toNumber(row.compare_at_price) : null,
    image: row.image_url || DEFAULT_PRODUCT_IMAGE,
    images: [row.image_url || DEFAULT_PRODUCT_IMAGE],
    clubPoint: 0,
    category: categorySlug,
    categoryName,
    brand: brandName,
    description: row.description || "",
    sku: row.sku || "",
    tags: [],
    colors: [],
    sizes: [],
    inStock: row.stock_count > 0,
    stockCount: row.stock_count,
    seller: {
      id: shop?.id || "",
      name: shop?.name || "Shop",
      slug: shop?.slug || "shop",
      logo: shop?.logo_url || DEFAULT_SHOP_LOGO,
      rating: toNumber(shop?.rating, 0),
      productCount: shop?.product_count || 0,
    },
    rating: toNumber(row.rating, 0),
    reviewCount: row.review_count || 0,
  };
}

const COUNTS_TTL_MS = 5 * 60 * 1000;
let categoryCountsCache: { at: number; map: Map<string, number> } | null = null;

async function getCategoryCounts(
  supabase: ReturnType<typeof createStorefrontClient>,
  categoryIds: string[],
): Promise<Map<string, number>> {
  if (categoryCountsCache && Date.now() - categoryCountsCache.at < COUNTS_TTL_MS) {
    return categoryCountsCache.map;
  }

  const map = new Map<string, number>();
  for (const id of categoryIds) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("category_id", id);
      if (!error) {
        map.set(id, count || 0);
        break;
      }
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }

  categoryCountsCache = { at: Date.now(), map };
  return map;
}

export async function getHomeStorefrontData() {
  const supabase = createStorefrontClient();

  // Fetch categories, brands, products, and banners in parallel.
  // Products query omits the categories/brands JOIN — names are resolved
  // from the separately-fetched lookup maps to keep the main query simple.
  const [
    { data: categories, error: catErr },
    { data: brands, error: brandErr },
    { data: productRows, error: prodErr },
    bannerSlides,
  ] = await Promise.all([
    supabase.from("categories").select("id,name,slug,image_url").order("name"),
    supabase.from("brands").select("id,name,slug,logo_url").order("name"),
    supabase
      .from("products")
      .select("id,title,slug,price,compare_at_price,image_url,sku,stock_count,rating,review_count,category_id,brand_id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100),
    getActiveBannerSlides(),
  ]);

  if (catErr) console.error("[storefront] categories error:", catErr.message);
  if (brandErr) console.error("[storefront] brands error:", brandErr.message);
  if (prodErr) console.error("[storefront] products error:", prodErr.message);

  type CatRow = { id: string; name: string; slug: string; image_url: string | null };
  type BrandRow = { id: string; name: string; slug: string; logo_url: string | null };

  const catRows = (categories || []) as CatRow[];
  const brandRows = (brands || []) as BrandRow[];

  const categoryById = new Map(catRows.map((c) => [c.id, { name: c.name, slug: c.slug }]));
  const brandById = new Map(brandRows.map((b) => [b.id, { name: b.name }]));

  const dbProducts: Product[] = ((productRows || []) as ProductRow[]).map((row) =>
    rowToProduct(row, categoryById, brandById)
  );

  console.log(`[storefront] fetched ${dbProducts.length} active products from database`);

  // Real per-category product counts. Head-only count queries run
  // sequentially with retries (parallel bursts drop requests under load),
  // and results are memoized for 5 minutes per server instance.
  const countsByCategoryId = await getCategoryCounts(
    supabase,
    catRows.map((c) => c.id),
  );

  const mappedCategories: Category[] = catRows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: "Grid3X3",
    image: c.image_url || DEFAULT_CATEGORY_IMAGE,
    productCount: countsByCategoryId.get(c.id) || 0,
  }));

  const mappedBrands: Brand[] = brandRows.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo: b.logo_url || DEFAULT_BRAND_LOGO,
  }));

  const flashDeals: FlashDeal[] = dbProducts
    .filter((p) => p.originalPrice && p.originalPrice > p.price)
    .slice(0, 15)
    .map((product) => ({
      product,
      discountPercent: Math.round(
        ((Number(product.originalPrice) - product.price) / Number(product.originalPrice)) * 100,
      ),
      dealEndTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    }));

  // If no products have a compare_at_price, generate flash deals from in-stock items
  const finalFlashDeals: FlashDeal[] =
    flashDeals.length > 0
      ? flashDeals
      : dbProducts
          .filter((p) => p.inStock)
          .slice()
          .sort(() => Math.random() - 0.5)
          .slice(0, 12)
          .map((product) => {
            const discountPercent = Math.floor(Math.random() * 50) + 10;
            const originalPrice = Math.max(
              Math.round(product.price * (1 + discountPercent / 100)),
              product.price + 1,
            );
            return {
              product: { ...product, originalPrice },
              discountPercent,
              dealEndTime: new Date(
                Date.now() + (Math.floor(Math.random() * 66) + 6) * 60 * 60 * 1000,
              ).toISOString(),
            } as FlashDeal;
          });

  return {
    categories: mappedCategories,
    brands: mappedBrands,
    products: dbProducts,
    flashDeals: finalFlashDeals,
    bannerSlides,
  };
}

export async function getProductBySlug(slug: string) {
  const supabase = createStorefrontClient();

  const { data } = await supabase
    .from("products")
    .select(
      "id,category_id,brand_id,title,slug,price,compare_at_price,image_url,description,sku,stock_count,rating,review_count,categories(name,slug),brands(name),shops(id,name,slug,logo_url,rating,product_count)",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  const product = rowToProduct(data as ProductRow);

  const relatedBaseQuery = supabase
    .from("products")
    .select(
      "id,category_id,brand_id,title,slug,price,compare_at_price,image_url,description,sku,stock_count,rating,review_count,categories(name,slug),brands(name),shops(id,name,slug,logo_url,rating,product_count)",
    )
    .eq("is_active", true)
    .neq("id", data.id)
    .limit(8);

  const relatedQuery = (data as ProductRow).category_id
    ? relatedBaseQuery.eq("category_id", (data as ProductRow).category_id as string)
    : relatedBaseQuery;

  const { data: relatedRows } = await relatedQuery;

  const relatedProducts = ((relatedRows || []) as ProductRow[]).map((r) => rowToProduct(r)).slice(0, 4);

  return { product, relatedProducts };
}

export async function getShopWithProducts(shopSlug: string, options?: { topSelling?: boolean }) {
  const supabase = createStorefrontClient();

  const { data: shopRow } = await supabase
    .from("shops")
    .select("id,name,slug,banner_url,logo_url,description,rating,product_count,created_at")
    .eq("slug", shopSlug)
    .maybeSingle();

  if (!shopRow) return null;

  let productsQuery = supabase
    .from("products")
    .select(
      "id,category_id,brand_id,title,slug,price,compare_at_price,image_url,description,sku,stock_count,rating,review_count,categories(name,slug),brands(name),shops(id,name,slug,logo_url,rating,product_count)",
    )
    .eq("shop_id", shopRow.id)
    .eq("is_active", true)
    .limit(120);

  productsQuery = options?.topSelling
    ? productsQuery.order("rating", { ascending: false })
    : productsQuery.order("created_at", { ascending: false });

  const { data: productRows } = await productsQuery;

  const shop: Shop = {
    id: shopRow.id,
    name: shopRow.name,
    slug: shopRow.slug,
    banner: shopRow.banner_url || DEFAULT_SHOP_BANNER,
    logo: shopRow.logo_url || DEFAULT_SHOP_LOGO,
    description: shopRow.description || "",
    rating: toNumber(shopRow.rating, 0),
    productCount: shopRow.product_count || 0,
    memberSince: shopRow.created_at,
  };

  const products = ((productRows || []) as ProductRow[]).map((r) => rowToProduct(r));

  return { shop, products };
}

export async function searchStoreProducts(
  query: string,
  page = 1,
  perPage = 24,
  categorySlug?: string,
): Promise<{ products: Product[]; total: number; categoryName?: string }> {
  const supabase = createStorefrontClient();
  const term = query.trim();
  const slug = categorySlug?.trim();
  if (!term && !slug) return { products: [], total: 0 };

  // Resolve category slug -> id so we can filter by FK
  let categoryId: string | null = null;
  let categoryName: string | undefined;
  if (slug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id,name")
      .eq("slug", slug)
      .maybeSingle();
    if (!cat) return { products: [], total: 0 };
    categoryId = cat.id;
    categoryName = cat.name;
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let dbQuery = supabase
    .from("products")
    .select(
      "id,category_id,brand_id,title,slug,price,compare_at_price,image_url,description,sku,stock_count,rating,review_count,categories(name,slug),brands(name),shops(id,name,slug,logo_url,rating,product_count)",
      { count: "exact" },
    )
    .eq("is_active", true);

  if (categoryId) dbQuery = dbQuery.eq("category_id", categoryId);
  if (term) {
    dbQuery = dbQuery.or(`title.ilike.%${term}%,description.ilike.%${term}%,sku.ilike.%${term}%`);
  }

  const { data: rows, count } = await dbQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    products: ((rows || []) as ProductRow[]).map((r) => rowToProduct(r)),
    total: count ?? 0,
    categoryName,
  };
}

export async function getBlogPosts() {
  const supabase = createStorefrontClient();

  const { data: rows } = await supabase
    .from("blog_posts")
    .select("id,title,slug,excerpt,content,image_url,published_at,created_at,author_id")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const authorIds = [...new Set((rows || []).map((row) => row.author_id).filter(Boolean))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const authorMap = new Map((authors || []).map((a) => [a.id, a.full_name || "Admin"]));

  return (rows || []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || "",
    content: row.content || "",
    image: row.image_url || "/images/placeholders/blog-1.svg",
    date: row.published_at || row.created_at,
    author: row.author_id ? (authorMap.get(row.author_id) ?? "Admin") : "Admin",
  })) as BlogPost[];
}

export async function getBlogPostBySlug(slug: string) {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getStorefrontCategories() {
  return (await getHomeStorefrontData()).categories;
}

export async function getStorefrontBrands() {
  return (await getHomeStorefrontData()).brands;
}

export async function getFlashDeals() {
  return (await getHomeStorefrontData()).flashDeals;
}
