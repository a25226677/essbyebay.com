import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  const [profileResult, shopResult, payoutsResult, withdrawalsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("shops")
      .select("name,is_verified")
      .eq("owner_id", userId)
      .maybeSingle(),
    supabase
      .from("seller_payouts")
      .select("net_amount")
      .eq("seller_id", userId),
    supabase
      .from("withdrawals")
      .select("amount,status")
      .eq("seller_id", userId),
  ]);

  const profile = profileResult.data;
  const shop = shopResult.data;

  const totalPayouts = (payoutsResult.data ?? []).reduce(
    (s, p) => s + Number(p.net_amount),
    0,
  );
  const totalWithdrawn = (withdrawalsResult.data ?? [])
    .filter((w) => w.status === "completed" || w.status === "approved")
    .reduce((s, w) => s + Number(w.amount), 0);
  const pendingWithdrawals = (withdrawalsResult.data ?? [])
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + Number(w.amount), 0);

  const balance = Math.max(0, totalPayouts - totalWithdrawn - pendingWithdrawals);

  return NextResponse.json({
    fullName: profile?.full_name ?? shop?.name ?? "Seller",
    avatarUrl: profile?.avatar_url ?? null,
    shopName: shop?.name ?? "",
    isVerified: shop?.is_verified ?? false,
    balance,
  });
}
