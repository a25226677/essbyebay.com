import { getSellerContext } from "@/lib/supabase/seller-api";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

function isValidTransactionPassword(value: string) {
  return /^\d{6}$/.test(value);
}

export async function PATCH(request: Request) {
  const context = await getSellerContext();
  if (context instanceof NextResponse) return context;

  const { userId } = context;

  let body: {
    currentTransactionPassword?: unknown;
    newTransactionPassword?: unknown;
    confirmTransactionPassword?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const currentTransactionPassword =
    typeof body.currentTransactionPassword === "string"
      ? body.currentTransactionPassword.trim()
      : "";
  const newTransactionPassword =
    typeof body.newTransactionPassword === "string"
      ? body.newTransactionPassword.trim()
      : "";
  const confirmTransactionPassword =
    typeof body.confirmTransactionPassword === "string"
      ? body.confirmTransactionPassword.trim()
      : "";

  if (!currentTransactionPassword) {
    return NextResponse.json(
      { error: "Current transaction password is required" },
      { status: 400 },
    );
  }

  if (!newTransactionPassword) {
    return NextResponse.json(
      { error: "New transaction password is required" },
      { status: 400 },
    );
  }

  if (!isValidTransactionPassword(newTransactionPassword)) {
    return NextResponse.json(
      { error: "Transaction password must be exactly 6 digits" },
      { status: 400 },
    );
  }

  if (newTransactionPassword !== confirmTransactionPassword) {
    return NextResponse.json(
      { error: "Transaction password confirmation does not match" },
      { status: 400 },
    );
  }

  const db = createAdminServiceClient();

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("transaction_password")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Seller profile not found" }, { status: 404 });
  }

  const existingTransactionPassword = String(profile.transaction_password || "").trim();

  if (!existingTransactionPassword) {
    return NextResponse.json(
      { error: "No transaction password configured. Please contact admin to set one." },
      { status: 400 },
    );
  }

  if (existingTransactionPassword !== currentTransactionPassword) {
    return NextResponse.json(
      { error: "Current transaction password is incorrect" },
      { status: 401 },
    );
  }

  if (existingTransactionPassword === newTransactionPassword) {
    return NextResponse.json(
      { error: "New transaction password must be different from current password" },
      { status: 400 },
    );
  }

  const { error: updateError } = await db
    .from("profiles")
    .update({ transaction_password: newTransactionPassword })
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
