"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserData = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  creditScore: number;
  balance: number;
  guaranteeMoney: number;
  shopName: string;
  shopLogoUrl: string | null;
  isVerified: boolean;
};

const DEFAULT: UserData = {
  fullName: "Seller",
  email: "",
  avatarUrl: null,
  creditScore: 100,
  balance: 0,
  guaranteeMoney: 0,
  shopName: "",
  shopLogoUrl: null,
  isVerified: false,
};

export function useUserData(): { user: UserData; loading: boolean } {
  const [user, setUser] = useState<UserData>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const [{ data: profile }, { data: shop }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, avatar_url, credit_score, wallet_balance, balance, guarantee_money, is_verified")
          .eq("id", authUser.id)
          .maybeSingle(),
        supabase
          .from("shops")
          .select("name, logo_url, is_verified")
          .eq("owner_id", authUser.id)
          .maybeSingle(),
      ]);

      setUser({
        fullName:
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          "Seller",
        email: authUser.email || "",
        avatarUrl: profile?.avatar_url || null,
        creditScore: profile?.credit_score && profile.credit_score > 0 ? profile.credit_score : 100,
        balance: profile?.wallet_balance ?? profile?.balance ?? 0,
        guaranteeMoney: profile?.guarantee_money ?? 0,
        shopName: shop?.name || "",
        shopLogoUrl: shop?.logo_url || null,
        isVerified: shop?.is_verified ?? profile?.is_verified ?? false,
      });
      setLoading(false);
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    // Live-update balance/credit when admin approves a recharge
    let realtimeSub: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      realtimeSub = supabase
        .channel(`profile-live-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
          () => { load(); },
        )
        .subscribe();
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeSub) supabase.removeChannel(realtimeSub);
    };
  }, []);

  return { user, loading };
}
