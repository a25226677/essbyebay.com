import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

function createTxnId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `OFF-${stamp}-${rand}`;
}

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  // Service-role client bypasses RLS for trusted server-side inserts.
  // The seller's identity is already verified above via getSellerContext.
  const adminDb = createAdminServiceClient();

  try {
    const formData = await request.formData();
    const amount = Number(formData.get("amount"));
    const method = String(formData.get("method") || "Bank").trim();
    const photo = formData.get("photo") as File | null;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!photo || photo.size <= 0) {
      return NextResponse.json(
        { error: "Payment proof image is required" },
        { status: 400 },
      );
    }

    if (!photo.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }

    const ext = photo.name.split(".").pop() || "jpg";
    const path = `${userId}/recharges/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("seller-files")
      .upload(path, photo, { contentType: photo.type, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload payment proof: ${uploadError.message}` },
        { status: 400 },
      );
    }

    const { data: urlData } = supabase.storage
      .from("seller-files")
      .getPublicUrl(path);
    const photoUrl = urlData.publicUrl;
    const txnId = createTxnId();

    const { error } = await adminDb.from("offline_recharges").insert({
      user_id: userId,
      amount,
      method,
      txn_id: txnId,
      photo_url: photoUrl,
      type: "Balance Recharge",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, txn_id: txnId, photo_url: photoUrl });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
