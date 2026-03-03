import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function getOrCreateCategoryId(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  categoryName: string,
) {
  const name = categoryName.trim();
  const slug = slugify(name);

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from("categories")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return inserted.id;
}

async function getOrCreateBrandId(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  brandName: string,
) {
  const name = brandName.trim();
  if (!name) return null;

  const slug = slugify(name);

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from("brands")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return inserted.id;
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

export async function GET(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { searchParams } = new URL(request.url);

  const search = (searchParams.get("search") || "").trim();
  const page = Math.max(Number(searchParams.get("page") || "1"), 1);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || "10"), 1), 50);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("products")
    .select(
      "id,title,slug,price,stock_count,is_active,image_url,created_at,categories(name),brands(name)",
      { count: "exact" },
    )
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  try {
    const body = await request.json();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "").trim();
    const brand = String(body.brand || "").trim();
    const sku = String(body.sku || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    const price = Number(body.price || 0);
    const stockCount = Number(body.stockCount || 0);

    if (!title) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    if (Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    if (Number.isNaN(stockCount) || stockCount < 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    const shopId = await ensureSellerShopId(supabase, userId);
    const categoryId = await getOrCreateCategoryId(supabase, category);
    const brandId = brand ? await getOrCreateBrandId(supabase, brand) : null;

    const baseSlug = slugify(title) || `product-${Date.now()}`;

    const { data: created, error } = await supabase
      .from("products")
      .insert({
        seller_id: userId,
        shop_id: shopId,
        category_id: categoryId,
        brand_id: brandId,
        title,
        slug: `${baseSlug}-${Date.now().toString().slice(-6)}`,
        sku: sku || null,
        description: description || null,
        price,
        stock_count: stockCount,
        image_url: imageUrl || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: created.id });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
