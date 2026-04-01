import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { userId } = context;
  const db = createAdminServiceClient();
  const { id: orderId } = await params;

  // Parse request body to get transaction password
  let transactionPassword: string | null = null;
  try {
    const body = await request.json();
    transactionPassword = body.transactionPassword || null;
  } catch {
    // Continue without password (for backwards compatibility)
  }

  const cleanedTransactionPassword = transactionPassword?.trim() || "";

  // Validate transaction password
  if (!cleanedTransactionPassword) {
    return NextResponse.json(
      { error: "Transaction Password is required" },
      { status: 400 }
    );
  }

  if (!/^\d{6}$/.test(cleanedTransactionPassword)) {
    return NextResponse.json(
      { error: "Transaction password must be exactly 6 digits" },
      { status: 400 }
    );
  }

  // Get seller profile to validate password
  const { data: sellerProfile } = await db
    .from("profiles")
    .select("transaction_password")
    .eq("id", userId)
    .single();

  if (!sellerProfile) {
    return NextResponse.json(
      { error: "Seller profile not found" },
      { status: 404 }
    );
  }

  if (!sellerProfile.transaction_password) {
    return NextResponse.json(
      { error: "No transaction password configured. Please update it in Settings or contact admin." },
      { status: 400 }
    );
  }

  // Validate password matches
  if (sellerProfile.transaction_password !== cleanedTransactionPassword) {
    return NextResponse.json(
      { error: "Invalid Transaction Password" },
      { status: 401 }
    );
  }

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
    .select("id, payment_status, profit, pickup_status, unfreeze_date")
    .eq("order_id", orderId)
    .eq("seller_id", userId)
    .maybeSingle();

  if (frozeOrder?.payment_status === "paid") {
    return NextResponse.json(
      { error: "Storehouse fee for this order is already paid" },
      { status: 400 }
    );
  }

  // Calculate storehouse total (what seller owes) and profit.
  // releaseAmount = gross seller sale for this order slice.
  const storehouseTotal = sellerItems.reduce(
    (sum, item) => sum + Number(item.storehouse_price || 0) * Number(item.quantity || 0),
    0
  );
  const subtotal = sellerItems.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const profit = Math.max(0, subtotal - storehouseTotal);
  const releaseAmount = Number((storehouseTotal + profit).toFixed(2));

  // Read order lifecycle state so we can place the full release amount in the correct bucket.
  const { data: orderMeta, error: orderMetaError } = await db
    .from("orders")
    .select("order_code, created_at, status, delivery_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderMetaError) {
    return NextResponse.json({ error: orderMetaError.message }, { status: 500 });
  }

  const isAlreadyDelivered =
    String(orderMeta?.delivery_status || "").toLowerCase() === "delivered" ||
    String(orderMeta?.status || "").toLowerCase() === "delivered";
  const nextPickupStatus = isAlreadyDelivered ? "picked_up" : "unpicked_up";

  // Get seller's current wallet balance
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("wallet_balance,pending_balance")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Could not retrieve balance" },
      { status: 500 }
    );
  }

  const currentBalance = Number(profile.wallet_balance || 0);
  const currentPending = Number(profile.pending_balance || 0);

  if (currentBalance < storehouseTotal) {
    return NextResponse.json(
      {
        error: `Insufficient wallet balance. You need $${storehouseTotal.toFixed(2)} but have $${currentBalance.toFixed(2)}`,
      },
      { status: 400 }
    );
  }

  // Deduct storehouse fee from wallet, then route release amount by lifecycle:
  // delivered -> credit wallet now, otherwise -> hold in pending.
  const nextWalletBalance =
    currentBalance - storehouseTotal + (isAlreadyDelivered ? releaseAmount : 0);
  const nextPendingBalance =
    currentPending + (isAlreadyDelivered ? 0 : releaseAmount);

  const { error: balanceError } = await db
    .from("profiles")
    .update({
      wallet_balance: nextWalletBalance,
      pending_balance: nextPendingBalance,
    })
    .eq("id", userId);

  if (balanceError) {
    return NextResponse.json({ error: balanceError.message }, { status: 500 });
  }

  const orderCode =
    orderMeta?.order_code ||
    `${new Date(orderMeta?.created_at || Date.now()).toISOString().slice(0, 10).replace(/-/g, "")}-${orderId.slice(0, 8).toUpperCase()}`;

  // Set unfreeze_date to 24 hours from now (standard freeze period)
  const unfreezeDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();

  // Record/update storehouse payment in froze_orders
  let updateError: { message: string } | null = null;
  if (frozeOrder) {
    const { error } = await db
      .from("froze_orders")
      .update({ payment_status: "paid", profit, unfreeze_date: unfreezeDate, pickup_status: nextPickupStatus })
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
      pickup_status: nextPickupStatus,
      unfreeze_date: unfreezeDate,
    });
    updateError = error;
  }

  if (updateError) {
    // Rollback balance on failure
    await db
      .from("profiles")
      .update({ wallet_balance: currentBalance, pending_balance: currentPending })
      .eq("id", userId);

    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: orderUpdateError } = await db
    .from("orders")
    .update({ pickup_status: nextPickupStatus })
    .eq("id", orderId);

  if (orderUpdateError) {
    await db
      .from("profiles")
      .update({ wallet_balance: currentBalance, pending_balance: currentPending })
      .eq("id", userId);

    if (frozeOrder) {
      await db
        .from("froze_orders")
        .update({
          payment_status: frozeOrder.payment_status,
          profit: frozeOrder.profit,
          pickup_status: frozeOrder.pickup_status,
          unfreeze_date: frozeOrder.unfreeze_date,
        })
        .eq("id", frozeOrder.id);
    } else {
      await db
        .from("froze_orders")
        .delete()
        .eq("order_id", orderId)
        .eq("seller_id", userId);
    }

    return NextResponse.json({ error: orderUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Store payment of $${storehouseTotal.toFixed(2)} processed successfully`,
    deducted: storehouseTotal,
    newBalance: nextWalletBalance,
    pendingBalance: nextPendingBalance,
    profit,
    release_amount: releaseAmount,
    credited_to_wallet: isAlreadyDelivered ? releaseAmount : 0,
  });
}
