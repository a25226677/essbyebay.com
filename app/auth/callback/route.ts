import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = request.nextUrl;
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || requestOrigin;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType =
    (searchParams.get("type") as EmailOtpType | null) ?? "magiclink";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/account";
  const safePath = next.startsWith("/") ? next : "/account";
  const loginPath = safePath.startsWith("/seller")
    ? "/seller/login"
    : "/users/login";

  const pendingCookies: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet);
        },
      },
    },
  );

  const redirectWithPendingCookies = (destination: string) => {
    const response = NextResponse.redirect(destination);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  };

  const redirectToLoginWithError = (message: string) => {
    const url = new URL(`${origin}${loginPath}`);
    url.searchParams.set("error", message);
    return redirectWithPendingCookies(url.toString());
  };

  // Handle OAuth errors returned by provider
  if (error) {
    return redirectToLoginWithError(errorDescription || error);
  }

  if (!code && !tokenHash) {
    return redirectToLoginWithError("missing_auth_params");
  }

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return redirectToLoginWithError(exchangeError.message);
    }
  }

  if (tokenHash) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (verifyError) {
      return redirectToLoginWithError(verifyError.message);
    }
  }

  return redirectWithPendingCookies(`${origin}${safePath}`);
}
