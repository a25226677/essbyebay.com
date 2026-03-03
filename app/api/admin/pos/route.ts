import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

// GET: Search products for POS
export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const search = (request.nextUrl.searchParams.get("search") || "").trim();

  let query = db
    .from("products")
    .select("id, title, sku, price, stock_count, image_url, shops(name)")
    .eq("is_active", true)
    .gt("stock_count", 0)
    .order("title", { ascending: true })
    .limit(50);

  if (search) query = query.ilike("title", `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

// POST: Create a POS / walk-in order
export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db, userId } = context;

  const body = await request.json();
  const { items, customer_id, discount_amount = 0, notes = "POS order" } = body;

  if (!items || !Array.isArray(items) || items.length === 0)
    return NextResponse.json({ error: "items required" }, { status: 400 });

  const subtotal = items.reduce(
    (s: number, i: { unit_price: number; quantity: number }) =>
      s + i.unit_price * i.quantity,
    0,
  );
  const total_amount = Math.max(0, subtotal - discount_amount);
  const user_id = customer_id || userId;

  // Create the order
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      user_id,
      status: "paid",
      payment_status: "succeeded",
      subtotal,
      shipping_fee: 0,
      discount_amount,
      total_amount,
      notes,
    })
    .select()
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  // Insert order items
  const orderItems = items.map(
    (i: {
      product_id: string;
      seller_id: string;
      quantity: number;
      unit_price: number;
    }) => ({
      order_id: order.id,
      product_id: i.product_id,
      seller_id: i.seller_id,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: i.unit_price * i.quantity,
    }),
  );

  const { error: itemsError } = await db.from("order_items").insert(orderItems);
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 });

  // Decrement stock for each product
  for (const i of items as Array<{ product_id: string; quantity: number }>) {
    const { data: prod } = await db.from("products").select("stock_count").eq("id", i.product_id).single();
    if (prod) {
      await db.from("products").update({ stock_count: Math.max(0, prod.stock_count - i.quantity) }).eq("id", i.product_id);
    }
  }

  return NextResponse.json({ order }, { status: 201 });
}
