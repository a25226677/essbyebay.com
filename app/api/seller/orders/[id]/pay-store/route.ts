import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { userId } = context;
  const db = createAdminServiceClient();
  const { id: orderId } = await params;

  // Find seller's products for ownership fallback
  const { data: sellerProducts } = await db
    .from("products")
    .select("id")
    .eq("seller_id", userId);
  const sellerProductIds = (sellerProducts || []).map((p: { id: string }) => p.id);

  // Fetch all items for this order
  const { data: allItems, error: itemsError } = await db
    .from("order_items")
    .select("id, product_id, line_total, storehouse_price, quantity, seller_id")
    .eq("order_id", orderId);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Filter to items that belong to this seller (via seller_id OR product ownership)
  const sellerItems = (allItems || []).filter(
    (item) => item.seller_id === userId || sellerProductIds.includes(item.product_id)
  );

  if (sellerItems.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check if the storehouse fee for this order has already been paid
  const { data: frozeOrder } = await db
    .from("froze_orders")
    .select("id, payment_status")
    .eq("order_id", orderId)
    .eq("seller_id", userId)
    .maybeSingle();

  if (frozeOrder?.payment_status === "paid") {
    return NextResponse.json(
      { error: "Storehouse fee for this order is already paid" },
      { status: 400 }
    );
  }

  // Calculate storehouse total (what seller owes) and profit
  const storehouseTotal = sellerItems.reduce(
    (sum, item) => sum + Number(item.storehouse_price || 0) * Number(item.quantity || 0),
    0
  );
  const subtotal = sellerItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const profit = Math.max(0, subtotal - storehouseTotal);

  // Get seller's current wallet balance
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("wallet_balance")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Could not retrieve balance" },
      { status: 500 }
    );
  }

  const currentBalance = Number(profile.wallet_balance || 0);

  if (currentBalance < storehouseTotal) {
    return NextResponse.json(
      {
        error: `Insufficient wallet balance. You need $${storehouseTotal.toFixed(2)} but have $${currentBalance.toFixed(2)}`,
      },
      { status: 400 }
    );
  }

  // Deduct from seller wallet balance
  const { error: balanceError } = await db
    .from("profiles")
    .update({ wallet_balance: currentBalance - storehouseTotal })
    .eq("id", userId);

  if (balanceError) {
    return NextResponse.json({ error: balanceError.message }, { status: 500 });
  }

  // Fetch order code for display
  const { data: orderRow } = await db
    .from("orders")
    .select("order_code, created_at")
    .eq("id", orderId)
    .maybeSingle();

  const orderCode =
    orderRow?.order_code ||
    `${new Date(orderRow?.created_at || Date.now()).toISOString().slice(0, 10).replace(/-/g, "")}-${orderId.slice(0, 8).toUpperCase()}`;

  // Set unfreeze_date to 7 days from now (standard freeze period)
  const unfreezeDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Record/update storehouse payment in froze_orders
  let updateError: { message: string } | null = null;
  if (frozeOrder) {
    const { error } = await db
      .from("froze_orders")
      .update({ payment_status: "paid", profit, unfreeze_date: unfreezeDate })
      .eq("id", frozeOrder.id);
    updateError = error;
  } else {
    const { error } = await db.from("froze_orders").insert({
      seller_id: userId,
      order_id: orderId,
      order_code: orderCode,
      amount: storehouseTotal,
      profit,
      payment_status: "paid",
      pickup_status: "unpicked_up",
      unfreeze_date: unfreezeDate,
    });
    updateError = error;
  }

  if (updateError) {
    // Rollback balance on failure
    await db
      .from("profiles")
      .update({ wallet_balance: currentBalance })
      .eq("id", userId);

    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Store payment of $${storehouseTotal.toFixed(2)} processed successfully`,
    deducted: storehouseTotal,
    newBalance: currentBalance - storehouseTotal,
    profit,
  });
}
