import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("seller_payments")
    .select("id,amount,payment_details,trx_id,created_at", { count: "exact" })
    .eq("seller_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map((row) => ({
    id: row.id,
    date: new Date(row.created_at).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    amount: Number(row.amount || 0),
    method: row.payment_details?.match(/\(([^)]+)\)/)?.[1] || (row.trx_id ? "Transaction" : "Admin"),
    status: "Completed",
    payment_details: row.payment_details || "Seller payment",
    trx_id: row.trx_id || null,
  }));

  const filtered =
    search.length > 0
      ? items.filter((item) =>
          item.id.toLowerCase().includes(search) ||
          item.method.toLowerCase().includes(search) ||
          item.payment_details.toLowerCase().includes(search) ||
          (item.trx_id || "").toLowerCase().includes(search),
        )
      : items;

  return NextResponse.json({
    items: filtered,
    pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
  });
}
