import { getSellerContext } from "@/lib/supabase/seller-api";
import { getSellerStorehouseCatalog } from "@/lib/seller-storehouse-catalog";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(request.url);

  try {
    const response = await getSellerStorehouseCatalog(context, {
      search: searchParams.get("search") || "",
      categoryId: searchParams.get("category_id") || "",
      brandId: searchParams.get("brand_id") || "",
      page: Number(searchParams.get("page") || "1"),
      limit: Number(searchParams.get("limit") || "50"),
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load storehouse catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
