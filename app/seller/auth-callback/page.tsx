import { createClient } from "@/lib/supabase/server";
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
  const safeNext = next?.startsWith("/") ? next : "/seller/dashboard";

  if (error) {
    redirect(
      `/seller/login?error=${encodeURIComponent(error_description || error)}`,
    );
  }

  const supabase = await createClient();

  // PKCE callback flow
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      redirect(`/seller/login?error=${encodeURIComponent(exchangeError.message)}`);
    }
    redirect(safeNext);
  }

  // Magic-link callback flow
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });
    if (verifyError) {
      redirect(`/seller/login?error=${encodeURIComponent(verifyError.message)}`);
    }
    redirect(safeNext);
  }

  redirect("/seller/login?error=missing_auth_params");
}
