import { createClient } from "@/lib/supabase/server";
import type { BlogPost, Brand, Category, FlashDeal, Product, Shop } from "@/lib/types";
import { bannerSlides as placeholderBannerSlides } from "@/lib/placeholder-data";

const DEFAULT_PRODUCT_IMAGE = "/images/placeholders/product-1.svg";
const DEFAULT_CATEGORY_IMAGE = "/images/placeholders/computers.svg";
const DEFAULT_BRAND_LOGO = "/images/placeholders/brand-apple.svg";
const DEFAULT_SHOP_BANNER = "/images/placeholders/hero-1.svg";
const DEFAULT_SHOP_LOGO = "/images/placeholders/logo-footer.svg";

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
  title: string;
  slug: string;
  price: number | string;
  compare_at_price: number | string | null;
  image_url: string | null;
  description: string | null;
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
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("banners")
    .select("id,title,subtitle,image_url,link,button_text")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(10);

  const mapped = ((rows || []) as BannerRow[])
    // Only keep rows that have a real remote image — skip local SVG/placeholder paths
    .filter((row) => row.image_url?.startsWith("http"))
    .map((row) => ({
      id: row.id,
      image: row.image_url,
      title: row.title,
      subtitle: row.subtitle || "",
      link: row.link,
      buttonText: row.button_text,
    }));

  return mapped.length > 0 ? mapped : placeholderBannerSlides;
}

function rowToProduct(row: ProductRow): Product {
  const category = pickRelation(row.categories);
  const brand = pickRelation(row.brands);
  const shop = pickRelation(row.shops);

  const categorySlug = category?.slug || "uncategorized";
  const categoryName = category?.name || "Uncategorized";

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
    brand: brand?.name || "No Brand",
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

export async function getHomeStorefrontData() {
  const supabase = await createClient();

  const [{ data: categories }, { data: brands }, { data: productRows }, bannerSlides] = await Promise.all([
    supabase.from("categories").select("id,name,slug,image_url").order("name"),
    supabase.from("brands").select("id,name,slug,logo_url").order("name"),
    supabase
      .from("products")
      .select(
        "id,title,slug,price,compare_at_price,image_url,description,sku,stock_count,rating,review_count,categories(name,slug),brands(name),shops(id,name,slug,logo_url,rating,product_count)",
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500),
    getActiveBannerSlides(),
  ]);

  const products = ((productRows || []) as ProductRow[]).map(rowToProduct);

  const countsByCategory = new Map<string, number>();
  products.forEach((product) => {
    countsByCategory.set(product.category, (countsByCategory.get(product.category) || 0) + 1);
  });

  const mappedCategories: Category[] = (categories || []).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: "Grid3X3",
    image: category.image_url || DEFAULT_CATEGORY_IMAGE,
    productCount: countsByCategory.get(category.slug) || 0,
  }));

  const mappedBrands: Brand[] = (brands || []).map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo: brand.logo_url || DEFAULT_BRAND_LOGO,
  }));

  const flashDeals: FlashDeal[] = products
    .filter((product) => product.originalPrice && product.originalPrice > product.price)
    .slice(0, 15)
    .map((product) => ({
      product,
      discountPercent: Math.round(
        ((Number(product.originalPrice) - product.price) / Number(product.originalPrice)) * 100,
      ),
      dealEndTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    }));

  // If there are no real flash deals, create a fallback set of randomized
  // flash deals from existing products so the UI doesn't look empty.
  if (flashDeals.length === 0) {
    // helper: shuffle and pick up to 12 products that are in stock
    const shuffled = products
      .filter((p) => p.inStock)
      .slice()
      .sort(() => Math.random() - 0.5);

    const fallback = shuffled.slice(0, 12).map((product) => {
      const discountPercent = Math.floor(Math.random() * 50) + 10; // 10% - 59%
      const originalPrice = Math.max(
        Math.round(product.price * (1 + discountPercent / 100)),
        product.price + 1,
      );

      const dealEndTime = new Date(
        Date.now() + (Math.floor(Math.random() * (72 - 6)) + 6) * 60 * 60 * 1000,
      ).toISOString(); // between 6 and 72 hours

      // copy product and set originalPrice so UI shows discount
      const p = { ...product, originalPrice };

      return {
        product: p,
        discountPercent,
        dealEndTime,
      } as FlashDeal;
    });

    // use the fallback deals instead of empty list
    return {
      categories: mappedCategories,
      brands: mappedBrands,
      products,
      flashDeals: fallback,
      bannerSlides,
    };
  }

  return {
    categories: mappedCategories,
    brands: mappedBrands,
    products,
    flashDeals,
    bannerSlides,
  };
}

export async function getProductBySlug(slug: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select(
      "id,category_id,title,slug,price,compare_at_price,image_url,description,sku,stock_count,rating,review_count,categories(name,slug),brands(name),shops(id,name,slug,logo_url,rating,product_count)",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  const product = rowToProduct(data as ProductRow);

  const relatedBaseQuery = supabase
    .from("products")
    .select(
      "id,category_id,title,slug,price,compare_at_price,image_url,description,sku,stock_count,rating,review_count,categories(name,slug),brands(name),shops(id,name,slug,logo_url,rating,product_count)",
    )
    .eq("is_active", true)
    .neq("id", data.id)
    .limit(8);

  const relatedQuery = (data as ProductRow).category_id
    ? relatedBaseQuery.eq("category_id", (data as ProductRow).category_id as string)
    : relatedBaseQuery;

  const { data: relatedRows } = await relatedQuery;

  const relatedProducts = ((relatedRows || []) as ProductRow[]).map(rowToProduct).slice(0, 4);

  return { product, relatedProducts };
}

export async function getShopWithProducts(shopSlug: string, options?: { topSelling?: boolean }) {
  const supabase = await createClient();

  const { data: shopRow } = await supabase
    .from("shops")
    .select("id,name,slug,banner_url,logo_url,description,rating,product_count,created_at")
    .eq("slug", shopSlug)
    .maybeSingle();

  if (!shopRow) return null;

  let productsQuery = supabase
    .from("products")
    .select(
      "id,title,slug,price,compare_at_price,image_url,description,sku,stock_count,rating,review_count,categories(name,slug),brands(name),shops(id,name,slug,logo_url,rating,product_count)",
    )
    .eq("shop_id", shopRow.id)
    .eq("is_active", true)
    .limit(120);

  if (options?.topSelling) {
    productsQuery = productsQuery.order("rating", { ascending: false });
  } else {
    productsQuery = productsQuery.order("created_at", { ascending: false });
  }

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

  const products = ((productRows || []) as ProductRow[]).map(rowToProduct);

  return { shop, products };
}

export async function searchStoreProducts(
  query: string,
  page = 1,
  perPage = 24,
): Promise<{ products: Product[]; total: number }> {
  const supabase = await createClient();
  const term = query.trim();
  if (!term) return { products: [], total: 0 };

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data: rows, count } = await supabase
    .from("products")
    .select(
      "id,title,slug,price,compare_at_price,image_url,description,sku,stock_count,rating,review_count,categories(name,slug),brands(name),shops(id,name,slug,logo_url,rating,product_count)",
      { count: "exact" },
    )
    .eq("is_active", true)
    .or(`title.ilike.%${term}%,description.ilike.%${term}%,sku.ilike.%${term}%`)
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    products: ((rows || []) as ProductRow[]).map(rowToProduct),
    total: count ?? 0,
  };
}

export async function getBlogPosts() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("blog_posts")
    .select("id,title,slug,excerpt,content,image_url,published_at,created_at,author_id")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  const authorIds = [...new Set((rows || []).map((row) => row.author_id).filter(Boolean))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const authorMap = new Map((authors || []).map((author) => [author.id, author.full_name || "Admin"]));

  const posts: BlogPost[] = (rows || []).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || "",
    content: row.content || "",
    image: row.image_url || "/images/placeholders/blog-1.svg",
    date: row.published_at || row.created_at,
    author: row.author_id ? authorMap.get(row.author_id) || "Admin" : "Admin",
  }));

  return posts;
}

export async function getBlogPostBySlug(slug: string) {
  const posts = await getBlogPosts();
  return posts.find((post) => post.slug === slug) || null;
}

export async function getStorefrontCategories() {
  const data = await getHomeStorefrontData();
  return data.categories;
}

export async function getStorefrontBrands() {
  const data = await getHomeStorefrontData();
  return data.brands;
}

export async function getFlashDeals() {
  const data = await getHomeStorefrontData();
  return data.flashDeals;
}
