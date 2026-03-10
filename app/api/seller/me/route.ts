import { getSellerContext } from "@/lib/supabase/seller-api";
import { NextResponse } from "next/server";

/**
 * GET /api/seller/me
 * Returns the authenticated seller's profile + shop data for the sidebar/header.
 * Uses server-side auth (getUser) so email and all fields are always reliable.
 */
export async function GET() {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { supabase, userId } = context;

  // getUser() on the server is guaranteed to have the email
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: shop }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, credit_score, wallet_balance, balance, guarantee_money, is_verified")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("shops")
      .select("name, logo_url, is_verified")
      .eq("owner_id", userId)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    email: authUser?.email ?? "",
    fullName: profile?.full_name || authUser?.user_metadata?.full_name || "Seller",
    avatarUrl: profile?.avatar_url ?? null,
    creditScore:
      profile?.credit_score && profile.credit_score > 0 ? profile.credit_score : 100,
    balance: profile?.wallet_balance ?? profile?.balance ?? 0,
    guaranteeMoney: profile?.guarantee_money ?? 0,
    shopName: shop?.name ?? "",
    shopLogoUrl: shop?.logo_url ?? null,
    isVerified: shop?.is_verified ?? profile?.is_verified ?? false,
  });
}
