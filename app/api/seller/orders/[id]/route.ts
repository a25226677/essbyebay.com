import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";
import { sendOrderStatusEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { userId } = context;
  const db = createAdminServiceClient();
  const { id: orderId } = await params;

  // Find seller's products to check ownership by product as well
  const { data: sellerProducts } = await db
    .from("products")
    .select("id")
    .eq("seller_id", userId);

  const sellerProductIds = (sellerProducts || []).map((p: { id: string }) => p.id);

  // Fetch all items for this order, then filter to items belonging to this seller
  const { data: allItems, error: itemsError } = await db
    .from("order_items")
    .select("id, product_id, quantity, unit_price, line_total, storehouse_price, seller_id")
    .eq("order_id", orderId);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // An item belongs to this seller if seller_id matches OR the product is owned by this seller
  const sellerItems = (allItems || []).filter(
    (item) => item.seller_id === userId || sellerProductIds.includes(item.product_id)
  );

  if (sellerItems.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const productIds = sellerItems.map((item) => item.product_id);
  const { data: products } = await db
    .from("products")
    .select("id, title, image_url")
    .in("id", productIds);

  const productMap = new Map((products || []).map((p: { id: string; title: string; image_url: string | null }) => [p.id, p]));

  const { data: order, error: orderError } = await db
    .from("orders")
    .select(
      "id, order_code, status, payment_status, total_amount, shipping_fee, discount_amount, coupon_amount, tax_amount, payment_method, created_at, user_id, shipping_address_id"
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: customer } = await db
    .from("profiles")
    .select("full_name, phone")
    .eq("id", order.user_id)
    .maybeSingle();

  // Fetch shipping address if available
  let shippingAddr: Record<string, string> | null = null;
  if (order.shipping_address_id) {
    const { data: addr } = await db
      .from("addresses")
      .select("city, state, country")
      .eq("id", order.shipping_address_id)
      .maybeSingle();
    shippingAddr = addr as Record<string, string> | null;
  }

  const items = sellerItems.map((item) => {
    const product = productMap.get(item.product_id);
    return {
      id: item.id,
      title: product?.title || "Unknown Product",
      image_url: product?.image_url || null,
      quantity: item.quantity,
      unit_price: Number(item.unit_price || 0),
      line_total: Number(item.line_total || 0),
      storehouse_price: Number(item.storehouse_price || 0),
      delivery_type: "Home Delivery",
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const storehouseTotal = items.reduce(
    (sum, item) => sum + item.storehouse_price * item.quantity,
    0
  );
  const profit = subtotal - storehouseTotal;

  return NextResponse.json({
    id: order.id,
    order_code: order.order_code || order.id.slice(0, 8).toUpperCase(),
    status: order.status,
    payment_status: order.payment_status,
    delivery_status: order.status,
    created_at: order.created_at,
    total_amount: Number(order.total_amount || 0),
    subtotal,
    shipping_fee: Number(order.shipping_fee || 0),
    discount_amount: Number(order.discount_amount || 0),
    coupon_amount: Number(order.coupon_amount || 0),
    tax_amount: Number(order.tax_amount || 0),
    payment_method: order.payment_method || "Cash on Delivery",
    customer: {
      name: customer?.full_name || "Customer",
      email: "",
      phone: customer?.phone
        ? customer.phone.replace(/(\d{3})\d+(\d{2})/, "$1****$2")
        : "",
      address: shippingAddr
        ? [shippingAddr.city, shippingAddr.state, shippingAddr.country]
            .filter(Boolean)
            .join(", ")
        : "",
    },
    items,
    storehouse_total: storehouseTotal,
    profit,
  });
}

const validStatuses = new Set([
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

const validPaymentStatuses = new Set(["pending", "succeeded", "failed", "refunded"]);

export async function PATCH(request: Request, { params }: Params) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, string> = {};

    if (typeof body.status === "string") {
      const normalized = body.status.toLowerCase();
      if (!validStatuses.has(normalized)) {
        return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
      }
      updates.status = normalized;
    }

    if (typeof body.paymentStatus === "string") {
      const normalized = body.paymentStatus.toLowerCase();
      if (!validPaymentStatuses.has(normalized)) {
        return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
      }
      updates.payment_status = normalized;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { data: item, error: itemError } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", id)
      .eq("seller_id", userId)
      .limit(1)
      .maybeSingle();

    if (itemError) {
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    if (!item) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { error } = await supabase.from("orders").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send order status email to buyer (non-blocking)
    if (updates.status) {
      try {
        const db = createAdminServiceClient();
        const { data: order } = await db
          .from("orders")
          .select("user_id, total_amount, profiles!orders_user_id_fkey(full_name)")
          .eq("id", id)
          .single();

        if (order?.user_id) {
          const { data: { user: authUser } } = await db.auth.admin.getUserById(order.user_id);
          if (authUser?.email) {
            const profile = order.profiles as unknown as { full_name: string | null };
            await sendOrderStatusEmail({
              to: authUser.email,
              customerName: profile?.full_name || "Customer",
              orderId: id,
              status: updates.status,
              total: order.total_amount,
            });
          }
        }
      } catch {
        // Email failure should not block the update
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
