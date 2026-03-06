import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  try {
    const formData = await request.formData();
    const amount = Number(formData.get("amount"));
    const method = String(formData.get("method") || "Bank").trim();
    const photo = formData.get("photo") as File | null;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    let photoUrl: string | null = null;

    if (photo && photo.size > 0) {
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `recharges/${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("seller-files")
        .upload(path, photo, { contentType: photo.type });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("seller-files")
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("offline_recharges").insert({
      user_id: userId,
      amount,
      method,
      photo_url: photoUrl,
      type: "Balance Recharge",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
