import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SellerAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  const { code, error, error_description } = await searchParams;

  if (error) {
    redirect(
      `/seller/login?error=${encodeURIComponent(error_description || error)}`,
    );
  }

  if (!code) {
    redirect("/seller/login?error=missing_code");
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    redirect(
      `/seller/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  redirect("/seller/dashboard");
}
