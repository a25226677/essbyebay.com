import { createClient } from "@/lib/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Determine redirect based on ?next= param or Referer
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/";

  const response = NextResponse.redirect(new URL(next, request.url), {
    status: 303,
  });

  return response;
}
