"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function SellerAuthCallbackPage() {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const hash = window.location.hash.substring(1); // strip leading '#'
        const params = new URLSearchParams(hash);

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          window.location.href = "/seller/login?error=invalid_token";
          return;
        }

        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error("setSession error:", error.message);
          window.location.href = "/seller/login?error=session_failed";
          return;
        }

        window.location.href = "/seller/dashboard";
      } catch (err) {
        console.error("Auth callback error:", err);
        window.location.href = "/seller/login?error=auth_failed";
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Loader2 className="size-10 animate-spin text-purple-600 mb-4" />
      <p className="text-sm text-gray-500">Signing you in, please wait…</p>
    </div>
  );
}
