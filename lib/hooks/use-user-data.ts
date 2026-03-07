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
  isVerified: boolean;
};

const DEFAULT: UserData = {
  fullName: "Seller",
  email: "",
  avatarUrl: null,
  creditScore: 0,
  balance: 0,
  guaranteeMoney: 0,
  shopName: "",
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
          .select("full_name, avatar_url, credit_score, wallet_balance, balance, is_verified")
          .eq("id", authUser.id)
          .maybeSingle(),
        supabase
          .from("shops")
          .select("name, is_verified")
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
        creditScore: profile?.credit_score ?? 0,
        balance: profile?.balance ?? profile?.wallet_balance ?? 0,
        guaranteeMoney: 0,
        shopName: shop?.name || "",
        isVerified: shop?.is_verified ?? profile?.is_verified ?? false,
      });
      setLoading(false);
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
