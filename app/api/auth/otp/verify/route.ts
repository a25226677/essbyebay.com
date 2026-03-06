import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Find valid OTP: not used, not expired, matches email + code
    const { data: otp, error: fetchErr } = await supabase
      .from("otp_codes")
      .select("id, expires_at")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !otp) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // Check expiry
    if (new Date(otp.expires_at) < new Date()) {
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    // Mark OTP as used
    await supabase.from("otp_codes").update({ used: true }).eq("id", otp.id);

    return NextResponse.json({ success: true, verified: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
