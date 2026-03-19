import { getSellerContext } from "@/lib/supabase/seller-api";
import { sendProductUpdatedEmail, sendProductDeletedEmail } from "@/lib/email";
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

async function getOrCreateCategoryId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  categoryName: string,
) {
  const name = categoryName.trim();
  const slug = slugify(name);
  const { data: existing } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (existing?.id) return existing.id;
  const { data: inserted, error } = await supabase.from("categories").insert({ name, slug }).select("id").single();
  if (error) throw new Error(error.message);
  return inserted.id;
}

async function getOrCreateBrandId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  brandName: string,
) {
  const name = brandName.trim();
  if (!name) return null;
  const slug = slugify(name);
  const { data: existing } = await supabase.from("brands").select("id").eq("slug", slug).maybeSingle();
  if (existing?.id) return existing.id;
  const { data: inserted, error } = await supabase.from("brands").insert({ name, slug }).select("id").single();
  if (error) throw new Error(error.message);
  return inserted.id;
}

export async function GET(_request: Request, { params }: Params) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { id } = await params;

  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name), brands(name)")
    .eq("id", id)
    .eq("seller_id", userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.isActive === "boolean") {
      updates.is_active = body.isActive;
    }

    if (typeof body.title === "string") {
      updates.title = body.title.trim();
    }

    if (typeof body.description === "string") {
      updates.description = body.description;
    }

    if (typeof body.price === "number" && !Number.isNaN(body.price)) {
      updates.price = body.price;
    }

    if (typeof body.stockCount === "number" && !Number.isNaN(body.stockCount)) {
      updates.stock_count = body.stockCount;
    }

    if (body.sku !== undefined) {
      updates.sku = body.sku;
    }

    if (body.imageUrl !== undefined) {
      updates.image_url = body.imageUrl;
    }

    if (typeof body.isFeatured === "boolean") {
      updates.is_featured = body.isFeatured;
    }

    if (typeof body.isPromoted === "boolean") {
      updates.is_promoted = body.isPromoted;
    }

    if (typeof body.categoryName === "string" && body.categoryName.trim()) {
      updates.category_id = await getOrCreateCategoryId(supabase, body.categoryName);
    }

    if (typeof body.brandName === "string" && body.brandName.trim()) {
      updates.brand_id = await getOrCreateBrandId(supabase, body.brandName);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .eq("seller_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // send non-blocking update email to seller
    try {
      const { data: profile } = await supabase.from("profiles").select("full_name,email").eq("id", userId).maybeSingle();
      const sellerName = profile?.full_name || "Seller";
      const sellerEmail = profile?.email;
      let productTitle = updates.title as string | undefined;
      if (!productTitle) {
        const { data: prod } = await supabase.from("products").select("title").eq("id", id).maybeSingle();
        productTitle = prod?.title || "your product";
      }
      if (sellerEmail) sendProductUpdatedEmail(sellerEmail, sellerName, productTitle ?? "your product", id).catch(() => {});
    } catch (e) {
      // ignore
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { id } = await params;

  // fetch product title before deletion for notification
  const { data: existing } = await supabase.from("products").select("title").eq("id", id).eq("seller_id", userId).maybeSingle();
  const productTitle = existing?.title || "Product";

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("seller_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // notify seller about deletion
  try {
    const { data: profile } = await supabase.from("profiles").select("full_name,email").eq("id", userId).maybeSingle();
    const sellerName = profile?.full_name || "Seller";
    const sellerEmail = profile?.email;
    if (sellerEmail) sendProductDeletedEmail(sellerEmail, sellerName, productTitle).catch(() => {});
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ success: true });
}
