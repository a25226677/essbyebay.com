import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";

type UpdateSettingsPayload = {
  full_name?: unknown;
  phone?: unknown;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function GET() {
  const context = await getAdminContext();
  if (context instanceof NextResponse) {
    return context;
  }

  const { db, userId } = context;

  const [{ data: profile, error: profileError }, { data: authData, error: authError }] = await Promise.all([
    db.from("profiles").select("full_name, phone").eq("id", userId).maybeSingle(),
    db.auth.admin.getUserById(userId),
  ]);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      full_name: normalizeText(profile?.full_name),
      phone: normalizeText(profile?.phone),
      email: authData.user?.email || "",
    },
  });
}

export async function PATCH(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) {
    return context;
  }

  const { db, userId } = context;

  let body: UpdateSettingsPayload;
  try {
    body = (await request.json()) as UpdateSettingsPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const fullName = normalizeText(body.full_name);
  const phone = normalizeText(body.phone);

  const { error: updateProfileError } = await db
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
    })
    .eq("id", userId);

  if (updateProfileError) {
    return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
  }

  const { data: authUserData, error: authUserError } = await db.auth.admin.getUserById(userId);

  if (authUserError) {
    return NextResponse.json({ error: authUserError.message }, { status: 500 });
  }

  const existingUserMetadata =
    authUserData.user?.user_metadata && typeof authUserData.user.user_metadata === "object"
      ? authUserData.user.user_metadata
      : {};

  const { error: updateAuthError } = await db.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...existingUserMetadata,
      full_name: fullName,
    },
  });

  if (updateAuthError) {
    return NextResponse.json({ error: updateAuthError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
