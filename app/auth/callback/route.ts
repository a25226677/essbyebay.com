import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/account";

  // Handle OAuth errors returned by provider
  if (error) {
    const url = new URL(`${origin}/users/login`);
    url.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(url.toString());
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      const url = new URL(`${origin}/users/login`);
      url.searchParams.set("error", exchangeError.message);
      return NextResponse.redirect(url.toString());
    }
  }

  // Sanitise `next` to only allow relative paths
  const safePath = next.startsWith("/") ? next : "/account";
  return NextResponse.redirect(`${origin}${safePath}`);
}
