import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  // Avoid catching non-UUID segments that belong to other routes (e.g. /products/categories)
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { db } = context;

  const { data, error } = await db
    .from("products")
    .select(
      "id, title, slug, sku, description, price, compare_at_price, stock_count, image_url, category_id, brand_id, is_active"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ item: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { db } = context;
  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (typeof body.isActive === "boolean") updates.is_active = body.isActive;
    if (typeof body.today_deal === "boolean") updates.today_deal = body.today_deal;
    if (typeof body.is_featured === "boolean") updates.is_featured = body.is_featured;
    if (typeof body.price === "number") updates.price = body.price;
    if (typeof body.stock_count === "number") updates.stock_count = body.stock_count;
    if (typeof body.stockCount === "number") updates.stock_count = body.stockCount;
    if (typeof body.title === "string") updates.title = body.title;
    if (typeof body.slug === "string") updates.slug = body.slug;
    if (typeof body.sku === "string" || body.sku === null) updates.sku = body.sku;
    if (typeof body.description === "string" || body.description === null) updates.description = body.description;
    if (typeof body.compare_at_price === "number" || body.compare_at_price === null) {
      updates.compare_at_price = body.compare_at_price;
    }
    if (typeof body.category_id === "string" || body.category_id === null) updates.category_id = body.category_id;
    if (typeof body.brand_id === "string" || body.brand_id === null) updates.brand_id = body.brand_id;
    if (typeof body.image_url === "string" || body.image_url === null) updates.image_url = body.image_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { error } = await db.from("products").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { db } = context;
  const { id } = await params;

  const { error } = await db.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
