import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";

type UpdatePasswordPayload = {
  newPassword?: unknown;
};

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) {
    return context;
  }

  const { db, userId } = context;

  let body: UpdatePasswordPayload;
  try {
    body = (await request.json()) as UpdatePasswordPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const { error } = await db.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
