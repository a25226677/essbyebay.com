import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSellerApplicationEmail, sendAdminNewShopNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { shopName, sellerName, sellerEmail } = await request.json();

    // Send confirmation to seller
    await sendSellerApplicationEmail(
      sellerEmail || user.email!,
      sellerName || user.user_metadata?.full_name || "Seller",
      shopName
    );

    // Notify admin
    await sendAdminNewShopNotification(
      sellerName || user.user_metadata?.full_name || "Unknown",
      sellerEmail || user.email!,
      shopName
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}
