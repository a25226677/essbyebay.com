import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { data: wishlistItems } = await db.from("wishlist_items").select("product_id");
    const counts: Record<string,number> = {};
    (wishlistItems||[]).forEach((w:any)=>{ counts[w.product_id]=(counts[w.product_id]||0)+1; });
    const productIds = Object.keys(counts);
    if (productIds.length === 0) return NextResponse.json({data:[],total:0});
    // Batched to avoid PostgREST URL-length 400 when there are many wishlisted products
    const { queryInBatches } = await import("@/lib/supabase/query-helpers");
    type ProductRow = { id: string; title: string; price: number; image_url: string | null };
    const {data:products,error} = await queryInBatches<ProductRow>(
      (chunk) => db.from("products").select("id,title,price,image_url").in("id", chunk) as unknown as PromiseLike<{ data: ProductRow[] | null; error: { message: string } | null }>,
      productIds,
    );
    if (error) throw error;
    const enriched = (products||[]).map((p:any)=>({...p,wishlist_count:counts[p.id]||0}))
      .sort((a:any,b:any)=>b.wishlist_count-a.wishlist_count);
    return NextResponse.json({data:enriched,total:enriched.length});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
