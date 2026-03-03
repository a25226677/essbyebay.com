import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim().toLowerCase();

  const { data, error } = await supabase
    .from("seller_payouts")
    .select("id,created_at,net_amount,paid_at")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data || []).map((row) => ({
    id: row.id,
    date: new Date(row.created_at).toISOString().slice(0, 10),
    amount: Number(row.net_amount || 0),
    method: "Order Payout",
    status: row.paid_at ? "Completed" : "Pending",
  }));

  const filtered =
    search.length > 0
      ? items.filter((item) => item.id.toLowerCase().includes(search))
      : items;

  return NextResponse.json({ items: filtered });
}
