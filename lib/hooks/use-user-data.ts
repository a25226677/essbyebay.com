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
  fullName: "",
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

    // Fetch all seller data from the server-side API route.
    // This uses getUser() on the server which always has the correct email
    // and full auth context — unlike the client-side getSession() cache.
    const load = async () => {
      try {
        const res = await fetch("/api/seller/me", { cache: "no-store" });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        setUser({
          fullName:     data.fullName     || "Seller",
          email:        data.email        || "",
          avatarUrl:    data.avatarUrl    ?? null,
          creditScore:  data.creditScore  ?? 100,
          balance:      data.balance      ?? 0,
          guaranteeMoney: data.guaranteeMoney ?? 0,
          shopName:     data.shopName     || "",
          shopLogoUrl:  data.shopLogoUrl  ?? null,
          isVerified:   data.isVerified   ?? false,
        });
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    // Immediate refresh when seller saves shop settings
    window.addEventListener("shop-settings-updated", load);

    // Live-update when admin approves a recharge (profiles) or seller updates
    // shop settings (shops).
    let profileSub: ReturnType<typeof supabase.channel> | null = null;
    let shopSub: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id;
      if (!uid) return;

      profileSub = supabase
        .channel(`profile-live-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
          () => { load(); },
        )
        .subscribe();

      shopSub = supabase
        .channel(`shop-live-${uid}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "shops", filter: `owner_id=eq.${uid}` },
          () => { load(); },
        )
        .subscribe();
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("shop-settings-updated", load);
      if (profileSub) supabase.removeChannel(profileSub);
      if (shopSub) supabase.removeChannel(shopSub);
    };
  }, []);

  return { user, loading };
}
