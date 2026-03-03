import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  const { data: shop, error } = await supabase
    .from("shops")
    .select("id,name,slug,description,logo_url,banner_url,is_verified,rating,product_count")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ shop });
}

export async function PATCH(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
      updates.name = name;
    }
    if ("description" in body) updates.description = body.description || null;
    if ("logo_url" in body) updates.logo_url = body.logo_url || null;
    if ("banner_url" in body) updates.banner_url = body.banner_url || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const { error } = await supabase
      .from("shops")
      .update(updates)
      .eq("owner_id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
