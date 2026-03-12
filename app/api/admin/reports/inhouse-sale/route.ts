import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id") || "";
    let query = db.from("products").select("id, title, category_id, categories!products_category_id_fkey(name)", { count: "exact" })
      .is("seller_id", null);
    if (categoryId) query = query.eq("category_id", categoryId);
    query = query.order("title");
    const { data: products, error, count } = await query;
    if (error) throw error;
    // Get order item counts per product
    const productIds = (products||[]).map((p:any)=>p.id);
    let saleCounts: Record<string,number> = {};
    if (productIds.length > 0) {
      // Batched to avoid PostgREST URL-length 400 for large product catalogs
      const { queryInBatches } = await import("@/lib/supabase/query-helpers");
      const { data: items } = await queryInBatches<{ product_id: string }>(
        (chunk) => db.from("order_items").select("product_id").in("product_id", chunk) as unknown as PromiseLike<{ data: { product_id: string }[] | null; error: { message: string } | null }>,
        productIds,
      );
      (items||[]).forEach((item:any)=>{ saleCounts[item.product_id] = (saleCounts[item.product_id]||0)+1; });
    }
    const enriched = (products||[]).map((p:any)=>({...p, num_of_sale: saleCounts[p.id]||0}));
    return NextResponse.json({ data: enriched, total: count||0 });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
