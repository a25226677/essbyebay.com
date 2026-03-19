import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";
import { sendWalletRechargeRequestEmail } from "@/lib/email";

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  // Service-role client bypasses RLS for trusted server-side inserts.
  const adminDb = createAdminServiceClient();

  try {
    const formData = await request.formData();
    const amount = Number(formData.get("amount"));
    const photo = formData.get("photo") as File | null;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    let photoUrl: string | null = null;

    if (photo && photo.size > 0) {
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${userId}/guarantee/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("seller-files")
        .upload(path, photo, { contentType: photo.type, upsert: false });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("seller-files")
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const { error } = await adminDb.from("guarantee_recharges").insert({
      seller_id: userId,
      amount,
      method: "bank",
      photo_url: photoUrl,
      status: "pending",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();

        await sendWalletRechargeRequestEmail({
          to: user.email,
          customerName: profile?.full_name || "Seller",
          amount,
          method: "bank",
          reference: undefined,
          type: "guarantee",
        });
      }
    } catch {
      // Non-blocking
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
