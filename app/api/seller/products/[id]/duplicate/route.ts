import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(_request: Request, { params }: Params) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { id } = await params;

  const { data: existing, error: fetchError } = await supabase
    .from("products")
    .select("title,shop_id,category_id,brand_id,sku,description,price,stock_count,image_url")
    .eq("id", id)
    .eq("seller_id", userId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const baseTitle = `${existing.title} (Copy)`;
  const slugBase = slugify(baseTitle) || `product-copy-${Date.now()}`;

  const { data: created, error } = await supabase
    .from("products")
    .insert({
      seller_id: userId,
      shop_id: existing.shop_id,
      category_id: existing.category_id,
      brand_id: existing.brand_id,
      title: baseTitle,
      slug: `${slugBase}-${Date.now().toString().slice(-6)}`,
      sku: existing.sku,
      description: existing.description,
      price: existing.price,
      stock_count: existing.stock_count,
      image_url: existing.image_url,
      is_active: false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: created.id });
}
