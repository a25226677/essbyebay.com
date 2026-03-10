import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { id: orderId } = await params;

  // Verify seller owns items in this order
  const { data: sellerItems, error: itemsError } = await supabase
    .from("order_items")
    .select("id, line_total, storehouse_price, quantity")
    .eq("order_id", orderId)
    .eq("seller_id", userId);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  if (!sellerItems || sellerItems.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check if the storehouse fee for this order has already been paid
  // (tracked in froze_orders, NOT in orders.payment_status which belongs
  //  to the customer's purchase payment)
  const { data: frozeOrder } = await supabase
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

  // Calculate storehouse total that seller needs to pay
  const storehouseTotal = sellerItems.reduce(
    (sum, item) =>
      sum + Number(item.storehouse_price || 0) * Number(item.quantity || 0),
    0
  );

  // Get seller's current balance
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Could not retrieve balance" },
      { status: 500 }
    );
  }

  const currentBalance = Number(profile.balance || 0);

  if (currentBalance < storehouseTotal) {
    return NextResponse.json(
      {
        error: `Insufficient balance. You need $${storehouseTotal.toFixed(2)} but have $${currentBalance.toFixed(2)}`,
      },
      { status: 400 }
    );
  }

  // Deduct from seller balance
  const { error: balanceError } = await supabase
    .from("profiles")
    .update({ balance: currentBalance - storehouseTotal })
    .eq("id", userId);

  if (balanceError) {
    return NextResponse.json({ error: balanceError.message }, { status: 500 });
  }

  // Mark the storehouse fee as paid in froze_orders (not in orders.payment_status
  // which tracks whether the customer paid for their purchase)
  let updateError: { message: string } | null = null;
  if (frozeOrder) {
    const { error } = await supabase
      .from("froze_orders")
      .update({ payment_status: "paid" })
      .eq("id", frozeOrder.id);
    updateError = error;
  } else {
    // No froze_order row yet — create one to record this payment
    const orderCode = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${orderId.slice(0, 8)}`;
    const { error } = await supabase
      .from("froze_orders")
      .insert({
        seller_id: userId,
        order_id: orderId,
        order_code: orderCode,
        amount: storehouseTotal,
        profit: 0,
        payment_status: "paid",
        pickup_status: "unpicked_up",
      });
    updateError = error;
  }

  if (updateError) {
    // Rollback balance on failure
    await supabase
      .from("profiles")
      .update({ balance: currentBalance })
      .eq("id", userId);

    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Store payment of $${storehouseTotal.toFixed(2)} processed successfully`,
    deducted: storehouseTotal,
    newBalance: currentBalance - storehouseTotal,
  });
}
