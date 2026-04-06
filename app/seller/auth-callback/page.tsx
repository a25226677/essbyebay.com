import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

export default async function SellerAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    token_hash?: string;
    type?: EmailOtpType;
    next?: string;
    error?: string;
    error_description?: string;
  }>;
}) {
  const { code, token_hash, type, next, error, error_description } = await searchParams;
  const params = new URLSearchParams();

  if (code) params.set("code", code);
  if (token_hash) params.set("token_hash", token_hash);
  if (type) params.set("type", type);
  if (error) params.set("error", error);
  if (error_description) params.set("error_description", error_description);
  params.set("next", next?.startsWith("/") ? next : "/seller/dashboard");

  redirect(`/auth/callback?${params.toString()}`);
}
