import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;

  const { db } = context;

  try {
    const body = await request.json();
    const sellerId = String(body?.sellerId || "").trim();

    if (!sellerId) {
      return NextResponse.json({ error: "sellerId is required" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, role, is_active, disable_login")
      .eq("id", sellerId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile || profile.role !== "seller") {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    if (profile.is_active === false || profile.disable_login === true) {
      return NextResponse.json(
        { error: "This seller account is disabled" },
        { status: 400 },
      );
    }

    const { data: authUser, error: authUserError } = await db.auth.admin.getUserById(
      sellerId,
    );

    if (authUserError) {
      return NextResponse.json({ error: authUserError.message }, { status: 500 });
    }

    const email = authUser.user?.email;
    if (!email) {
      return NextResponse.json(
        { error: "Seller email is missing" },
        { status: 400 },
      );
    }

    const origin = new URL(request.url).origin;
    const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${origin}/auth/callback?next=/seller/dashboard` },
    });

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json(
        { error: "Unable to create seller login link" },
        { status: 500 },
      );
    }

    return NextResponse.json({ actionLink });
  } catch (error) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Invalid request payload") },
      { status: 400 },
    );
  }
}
