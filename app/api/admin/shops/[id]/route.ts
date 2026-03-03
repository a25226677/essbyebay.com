import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";
import { sendShopVerifiedEmail, sendShopUnverifiedEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { db } = context;
  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.isVerified === "boolean") updates.is_verified = body.isVerified;
    if (typeof body.is_verified === "boolean") updates.is_verified = body.is_verified;
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    // Get current shop info for email notification
    const { data: shop } = await db
      .from("shops")
      .select("name, is_verified, owner_id")
      .eq("id", id)
      .maybeSingle();

    const { error } = await db.from("shops").update(updates).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send email notification for verification changes
    if (shop && typeof updates.is_verified === "boolean" && updates.is_verified !== shop.is_verified) {
      try {
        const { data: owner } = await db
          .from("profiles")
          .select("full_name")
          .eq("id", shop.owner_id)
          .maybeSingle();

        const { data: authUser } = await db.auth.admin.getUserById(shop.owner_id);
        const email = authUser?.user?.email;
        const sellerName = owner?.full_name || "Seller";
        const shopName = (updates.name as string) || shop.name;

        if (email) {
          if (updates.is_verified) {
            sendShopVerifiedEmail(email, sellerName, shopName).catch(() => {});
          } else {
            sendShopUnverifiedEmail(email, sellerName, shopName).catch(() => {});
          }
        }
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
