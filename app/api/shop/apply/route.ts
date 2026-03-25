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
    const body = await request.json();
    const { shopName, sellerName, sellerEmail, captchaToken } = body;

    // verify captcha token server-side
    if (!captchaToken) {
      return NextResponse.json({ error: "CAPTCHA token is required" }, { status: 400 });
    }

    try {
      const secret = process.env.RECAPTCHA_SECRET_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SECRET_KEY;
      if (!secret) {
        return NextResponse.json({ error: "Server captcha configuration missing" }, { status: 500 });
      }

      const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: captchaToken }),
      });
      const verifyJson = await verifyRes.json().catch(() => ({}));
      if (!verifyJson.success) {
        return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({ error: "Failed to verify CAPTCHA" }, { status: 500 });
    }

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
