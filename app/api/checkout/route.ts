import { createClient } from "@/lib/supabase/server";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextRequest, NextResponse } from "next/server";
import { sendOrderConfirmationEmail } from "@/lib/email";

type CheckoutItem = {
  product_id: string;
  title: string;
  quantity: number;
  unit_price: number;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in to place an order." }, { status: 401 });
  }

  let body: {
    shipping_address: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      address: string;
      city: string;
      state?: string;
      zip?: string;
      country: string;
    };
    tax?: number;
    items: CheckoutItem[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { shipping_address, items } = body;

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  if (!shipping_address?.address || !shipping_address?.city || !shipping_address?.country) {
    return NextResponse.json({ error: "Shipping address is incomplete" }, { status: 400 });
  }

  // Use admin client for operations that need to bypass RLS (order_items insert)
  const db = createAdminServiceClient();

  // 1. Create a shipping address record
  const fullName = [shipping_address.first_name, shipping_address.last_name].filter(Boolean).join(" ") || user.user_metadata?.full_name || "Customer";
  const { data: address, error: addrErr } = await supabase
    .from("addresses")
    .insert({
      user_id: user.id,
      label: "Shipping",
      full_name: fullName,
      phone: shipping_address.phone || null,
      line_1: shipping_address.address,
      city: shipping_address.city,
      state: shipping_address.state || null,
      postal_code: shipping_address.zip || null,
      country: shipping_address.country,
    })
    .select("id")
    .single();

  if (addrErr || !address) {
    return NextResponse.json({ error: addrErr?.message || "Failed to save address" }, { status: 500 });
  }

  // 2. Look up seller_id for each product
  const productIds = [...new Set(items.map(i => i.product_id))];
  const { data: products, error: prodErr } = await db
    .from("products")
    .select("id, seller_id, price")
    .in("id", productIds);

  if (prodErr || !products) {
    return NextResponse.json({ error: "Failed to verify products" }, { status: 500 });
  }

  const sellerMap = new Map(products.map(p => [p.id, p.seller_id]));
  const productPriceMap = new Map(products.map(p => [p.id, Number(p.price || 0)]));

  // Validate all products have a seller
  for (const item of items) {
    if (!sellerMap.has(item.product_id)) {
      return NextResponse.json({ error: `Product not found: ${item.title}` }, { status: 400 });
    }
  }

  // 3. Calculate totals
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const tax = typeof body.tax === "number" ? body.tax : subtotal * 0.08;
  const total_amount = subtotal + tax;

  // 4. Create order (use admin client to avoid RLS issues)
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      user_id: user.id,
      shipping_address_id: address.id,
      status: "pending",
      payment_status: "pending",
      subtotal,
      shipping_fee: 0,
      discount_amount: 0,
      total_amount,
      notes: [shipping_address.email ? `Contact: ${shipping_address.email}` : null, tax > 0 ? `Tax: $${tax.toFixed(2)}` : null].filter(Boolean).join(" | ") || null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message || "Failed to create order" }, { status: 500 });
  }

  // 5. Create order items (with seller_id from products lookup)
  // Determine storehouse factor (fraction of unit price assigned to storehouse).
  // This controls seller profit: profit = subtotal - storehouseTotal.
  // Default factor is 0.7 (i.e. 30% profit). Make configurable via
  // website_settings.setting_key = 'seller_storehouse_factor' with a numeric value like '0.7'.
  let storehouseFactor = 0.7;
  try {
    const { data: settingRows } = await db
      .from("website_settings")
      .select("setting_key, setting_value")
      .eq("setting_key", "seller_storehouse_factor");
    const row = (settingRows || [])[0];
    if (row && row.setting_value) {
      const parsed = Number(row.setting_value);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 10) {
        // allow either fraction (0.7) or percent (70)
        storehouseFactor = parsed > 1 ? parsed / 100 : parsed;
      }
    }
  } catch {
    // ignore and use default
  }

  const orderItems = items.map((i) => {
    const unitPrice = Number(i.unit_price || productPriceMap.get(i.product_id) || 0);

    return {
      order_id: order.id,
      product_id: i.product_id,
      seller_id: sellerMap.get(i.product_id)!,
      quantity: i.quantity,
      unit_price: unitPrice,
      line_total: unitPrice * i.quantity,
      storehouse_price: Number((unitPrice * storehouseFactor).toFixed(2)),
    };
  });

  const { error: itemsError } = await db.from("order_items").insert(orderItems);

  if (itemsError) {
    // Rollback order if items fail
    await db.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // 6. Decrement product stock counts
  for (const item of items) {
    // Stock update
    const { data: prod } = await db.from("products").select("stock_count").eq("id", item.product_id).single();
    if (prod) {
      await db.from("products").update({ stock_count: Math.max(0, prod.stock_count - item.quantity) }).eq("id", item.product_id);
    }
  }

  // 7. Clear cart items after successful order
  await supabase.from("cart_items").delete().eq("user_id", user.id);

  // 8. Send order confirmation email (non-blocking)
  try {
    await sendOrderConfirmationEmail({
      to: user.email!,
      customerName: fullName,
      orderId: order.id,
      items: items.map(i => ({
        title: i.title,
        quantity: i.quantity,
        price: i.unit_price,
      })),
      subtotal,
      tax,
      shipping: 0,
      total: total_amount,
    });
  } catch {
    // Email failure should not block the order
  }

  return NextResponse.json({ orderId: order.id }, { status: 201 });
}
