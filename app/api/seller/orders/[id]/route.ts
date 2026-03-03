import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";
import { sendOrderStatusEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

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
