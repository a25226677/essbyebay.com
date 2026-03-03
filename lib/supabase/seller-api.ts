import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type SellerContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

export async function getSellerContext(): Promise<SellerContext | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profile || (profile.role !== "seller" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Seller access required" }, { status: 403 });
  }

  return { supabase, userId: user.id };
}
