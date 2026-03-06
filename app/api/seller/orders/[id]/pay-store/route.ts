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

  // Check if order is already paid
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("payment_status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.payment_status === "succeeded") {
    return NextResponse.json(
      { error: "Order is already paid" },
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

  // Mark order as paid
  const { error: updateError } = await supabase
    .from("orders")
    .update({ payment_status: "succeeded" })
    .eq("id", orderId);

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
