import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  const { data, error } = await supabase
    .from("products")
    .select("id,title,sku,price,stock_count,is_active,image_url,created_at,categories(name)")
    .eq("seller_id", userId)
    .or("is_active.eq.false,stock_count.eq.0")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).map((p, idx) => ({
    id: p.id,
    index: idx + 1,
    title: p.title,
    sku: p.sku ?? "—",
    price: Number(p.price),
    stock: p.stock_count,
    isActive: p.is_active,
    image: p.image_url,
    category:
      (p.categories as unknown as { name: string }[] | null)?.[0]?.name ?? "Uncategorized",
    reason: !p.is_active ? "Inactive" : "Out of Stock",
  }));

  return NextResponse.json({ items });
}
