import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

// GET: List / search products for POS — supports shop_id, category_id, brand_id, search
export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp = request.nextUrl.searchParams;
  const search = (sp.get("search") || "").trim();
  const shop_id = (sp.get("shop_id") || "").trim();
  const category_id = (sp.get("category_id") || "").trim();
  const brand_id = (sp.get("brand_id") || "").trim();

  let query = db
    .from("products")
    .select(
      "id, title, sku, price, stock_count, image_url, shop_id, seller_id, category_id, brand_id," +
      "shops!products_shop_id_fkey(id,name)," +
      "categories!products_category_id_fkey(id,name)," +
      "brands!products_brand_id_fkey(id,name)",
    )
    .eq("is_active", true)
    .order("title", { ascending: true })
    .limit(200);

  if (search) query = query.ilike("title", `%${search}%`);
  if (shop_id) query = query.eq("shop_id", shop_id);
  if (category_id) query = query.eq("category_id", category_id);
  if (brand_id) query = query.eq("brand_id", brand_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data || [] });
}

// POST: Create a POS order
export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db, userId } = context;

  const body = await request.json();
  const {
    items,
    customer_id,
    shipping_address_id,
    discount_amount = 0,
    shipping_fee = 0,
    payment_method = "cash",
    notes = "POS order",
  } = body;

  if (!items || !Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: "items required" }, { status: 400 });

  const subtotal = items.reduce(
    (s: number, i: { unit_price: number; quantity: number }) =>
      s + Number(i.unit_price) * Number(i.quantity),
    0,
  );
  const total_amount = Math.max(0, subtotal + Number(shipping_fee) - Number(discount_amount));
  const user_id = customer_id || userId;

  // Look up seller_id for each product from DB (do not rely on client payload)
  const productIds = [...new Set((items as Array<{ product_id: string }>).map((i) => i.product_id))];
  const { data: productRows } = await db
    .from("products")
    .select("id, seller_id")
    .in("id", productIds);
  const sellerMap = new Map((productRows || []).map((p) => [p.id, p.seller_id as string]));

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      user_id,
      status: "pending",
      payment_status: "pending",
      payment_method,
      subtotal,
      shipping_fee: Number(shipping_fee),
      discount_amount: Number(discount_amount),
      total_amount,
      shipping_address_id: shipping_address_id || null,
      notes,
    })
    .select()
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const orderItems = (items as Array<{ product_id: string; quantity: number; unit_price: number }>).map((i) => ({
    order_id: order.id,
    product_id: i.product_id,
    seller_id: sellerMap.get(i.product_id),
    quantity: i.quantity,
    unit_price: i.unit_price,
    line_total: i.unit_price * i.quantity,
  }));

  const { error: itemsError } = await db.from("order_items").insert(orderItems);
  if (itemsError) {
    // Rollback order so no orphan orders exist without items
    await db.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Decrement stock
  for (const i of items as Array<{ product_id: string; quantity: number }>) {
    const { data: prod } = await db
      .from("products")
      .select("stock_count")
      .eq("id", i.product_id)
      .single();
    if (prod) {
      await db
        .from("products")
        .update({ stock_count: Math.max(0, prod.stock_count - i.quantity) })
        .eq("id", i.product_id);
    }
  }

  return NextResponse.json({ order }, { status: 201 });
}
