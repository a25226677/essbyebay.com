import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

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
      const path = `guarantee/${userId}/${Date.now()}.${ext}`;
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

    const { error } = await supabase.from("guarantee_recharges").insert({
      seller_id: userId,
      amount,
      method: "bank",
      photo_url: photoUrl,
      status: "pending",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
