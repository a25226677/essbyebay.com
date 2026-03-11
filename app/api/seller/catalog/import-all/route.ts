import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;
  const { supabase, userId } = context;

  const body = await request.json();
  const { search = "", category_id = null, brand_id = null } = body as {
    search?: string;
    category_id?: string | null;
    brand_id?: string | null;
  };

  // Resolve seller's shop
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!shop) {
    return NextResponse.json({ error: "You must have a shop to import products" }, { status: 400 });
  }
  const shopId = shop.id;

  const { data, error } = await supabase.rpc("seller_import_catalog_products", {
    p_seller_id: userId,
    p_shop_id: shopId,
    p_search: search.trim() || null,
    p_category_id: category_id || null,
    p_brand_id: brand_id || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    success: true,
    imported: Number(summary?.imported_count ?? 0),
    skipped: Number(summary?.skipped_count ?? 0),
    total: Number(summary?.total_matching ?? 0),
  });
}
