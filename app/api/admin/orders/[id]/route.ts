import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";
import { sendOrderStatusEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  const { data, error } = await db
    .from("orders")
    .select(
      `*, profiles!orders_user_id_fkey(id, full_name, phone, avatar_url),
       addresses!orders_shipping_address_id_fkey(*),
       order_items(*, products(id, title, slug, image_url, price),
         profiles!order_items_seller_id_fkey(id, full_name))`,
    )
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Attach computed order_code
  const d = new Date(data.created_at as string);
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const time = d.toISOString().slice(11, 19).replace(/:/g, "") +
    String(d.getMilliseconds()).padStart(3, "0").slice(0, 2);
  const order_code = `${date}-${time}`;

  return NextResponse.json({ item: { ...data, order_code } });
}

export async function PATCH(request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.status           === "string") updates.status           = body.status;
    if (typeof body.payment_status   === "string") updates.payment_status   = body.payment_status;
    if (typeof body.paymentStatus    === "string") updates.payment_status   = body.paymentStatus;
    if (typeof body.delivery_status  === "string") updates.delivery_status  = body.delivery_status;
    if (typeof body.pickup_status    === "string") updates.pickup_status    = body.pickup_status;
    if (typeof body.tracking_code    === "string") updates.tracking_code    = body.tracking_code;
    if (typeof body.payment_method   === "string") updates.payment_method   = body.payment_method;

    // Sync pickup_status when delivery_status progresses
    if (typeof body.delivery_status === "string") {
      if (["picked_up", "on_the_way", "delivered"].includes(body.delivery_status)) {
        updates.pickup_status = "picked_up";
      }
    }

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });

    const { error } = await db.from("orders").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send order status email notification (non-blocking)
    if (updates.status || updates.delivery_status) {
      try {
        const { data: order } = await db
          .from("orders")
          .select("id, user_id, total_amount, delivery_status, profiles!orders_user_id_fkey(full_name)")
          .eq("id", id)
          .single();

        if (order?.user_id) {
          const { data: { user: authUser } } = await db.auth.admin.getUserById(order.user_id);
          if (authUser?.email) {
            const profile = order.profiles as unknown as { full_name: string | null };
            const statusLabel = (updates.delivery_status as string) || (updates.status as string);
            await sendOrderStatusEmail({
              to: authUser.email,
              customerName: profile?.full_name || "Customer",
              orderId: id,
              status: statusLabel,
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

export async function DELETE(_request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;
  const { id } = await params;

  const { error } = await db.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
