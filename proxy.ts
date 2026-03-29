import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session — MUST be done before any path checks
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApiRequest = pathname.startsWith("/api/");
  const isAdminApiRoute = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  const isSellerApiRoute = pathname === "/api/seller" || pathname.startsWith("/api/seller/");
  const isAdminPageRoute = pathname.startsWith("/admin");
  const isSellerPageRoute = pathname.startsWith("/seller");

  const unauthorizedApiResponse = () =>
    NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const forbiddenApiResponse = (message: string) =>
    NextResponse.json({ error: message }, { status: 403 });

  // ── Admin routes ────────────────────────────────────────────────
  if ((isAdminPageRoute || isAdminApiRoute) && !pathname.startsWith("/admin/login")) {
    if (!user) {
      if (isApiRequest) {
        return unauthorizedApiResponse();
      }

      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    // Verify admin role via profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      if (isApiRequest) {
        return forbiddenApiResponse("Admin access required");
      }

      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "not_admin");
      return NextResponse.redirect(url);
    }
  }

  // ── Seller routes ───────────────────────────────────────────────
  if (
    (isSellerPageRoute || isSellerApiRoute) &&
    !pathname.startsWith("/seller/login") &&
    !pathname.startsWith("/seller/auth-callback")
  ) {
    if (!user) {
      if (isApiRequest) {
        return unauthorizedApiResponse();
      }

      const url = request.nextUrl.clone();
      url.pathname = "/seller/login";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !["seller", "admin"].includes(profile.role)) {
      if (isApiRequest) {
        return forbiddenApiResponse("Seller access required");
      }

      const url = request.nextUrl.clone();
      url.pathname = "/seller/login";
      url.searchParams.set("error", "not_seller");
      return NextResponse.redirect(url);
    }
  }

  // ── Account page ────────────────────────────────────────────────
  if (pathname === "/account" || pathname.startsWith("/account/")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/users/login";
      url.searchParams.set("next", "/account");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/seller/:path*",
    "/api/admin/:path*",
    "/api/seller/:path*",
    "/account",
    "/account/:path*",
  ],
};
