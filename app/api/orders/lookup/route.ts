import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const orderId = (request.nextUrl.searchParams.get("id") || "").trim();
  const email = (request.nextUrl.searchParams.get("email") || "").trim().toLowerCase();

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `id, user_id, status, payment_status, subtotal, shipping_fee, total_amount, created_at, updated_at,
       shipping_address_id,
       order_items(id, quantity, unit_price, line_total, products(title, image_url, slug))`,
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to look up order" }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // If email provided, verify it matches the order owner (extra security)
  if (email) {
    if (order.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", order.user_id)
        .maybeSingle();

      if (profile && profile.email?.toLowerCase() !== email) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
    }
  }

  // Sanitise — do not expose internal user_id
  const safe = {
    id: order.id,
    status: order.status,
    payment_status: order.payment_status,
    subtotal: order.subtotal,
    shipping_fee: order.shipping_fee,
    total_amount: order.total_amount,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: order.order_items ?? [],
  };

  return NextResponse.json({ order: safe });
}
