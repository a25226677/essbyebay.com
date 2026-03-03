import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  const { data, error } = await supabase
    .from("seller_payouts")
    .select(
      "id,gross_amount,commission_rate,commission_amount,net_amount,paid_at,created_at,order_items(order_id)",
    )
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (data ?? []).map((row, idx) => {
    const orderItem = (row.order_items as unknown as { order_id: string }[] | null)?.[0] ?? null;
    return {
      id: row.id,
      index: idx + 1,
      orderCode: (orderItem?.order_id ?? row.id).slice(0, 8).toUpperCase(),
      grossAmount: Number(row.gross_amount),
      commissionRate: Number(row.commission_rate),
      commissionAmount: Number(row.commission_amount),
      sellerEarning: Number(row.net_amount),
      date: new Date(row.created_at).toISOString().slice(0, 10),
      status: row.paid_at ? "Paid" : "Pending",
    };
  });

  const totalEarned = items.reduce((s, i) => s + i.sellerEarning, 0);
  const totalCommission = items.reduce((s, i) => s + i.commissionAmount, 0);

  return NextResponse.json({ items, totalEarned, totalCommission });
}
