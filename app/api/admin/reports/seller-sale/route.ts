import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id") || "";
    let query = db.from("products").select("id, name, category_id, seller_id, categories!products_category_id_fkey(name), profiles!products_seller_id_fkey(full_name)", { count: "exact" })
      .not("seller_id","is",null);
    if (categoryId) query = query.eq("category_id", categoryId);
    query = query.order("name");
    const { data: products, error, count } = await query;
    if (error) throw error;
    const productIds = (products||[]).map((p:any)=>p.id);
    let saleCounts: Record<string,number> = {};
    if (productIds.length > 0) {
      const { data: items } = await db.from("order_items").select("product_id").in("product_id", productIds);
      (items||[]).forEach((item:any)=>{ saleCounts[item.product_id] = (saleCounts[item.product_id]||0)+1; });
    }
    const enriched = (products||[]).map((p:any)=>({...p, num_of_sale: saleCounts[p.id]||0}));
    return NextResponse.json({ data: enriched, total: count||0 });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
