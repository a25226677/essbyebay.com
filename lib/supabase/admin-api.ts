import { createClient } from "@/lib/supabase/server";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { NextResponse } from "next/server";

export type AdminContext = {
  /** Regular session-scoped client (auth + limited RLS) */
  supabase: Awaited<ReturnType<typeof createClient>>;
  /** Service-role client — bypasses all RLS. Use for admin data queries. */
  db: ReturnType<typeof createAdminServiceClient>;
  userId: string;
};

export async function getAdminContext(): Promise<AdminContext | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service-role client to read the profile without RLS restrictions
  const db = createAdminServiceClient();

  const { data: profile, error } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  return { supabase, db, userId: user.id };
}
