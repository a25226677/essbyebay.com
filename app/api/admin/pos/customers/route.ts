import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextResponse } from "next/server";

// GET: List all customer profiles for POS customer selector
export async function GET() {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const { data, error } = await db
    .from("profiles")
    .select("id, full_name, phone, avatar_url, role")
    .eq("role", "customer")
    .order("full_name", { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data || [];

  // Ensure POS dropdown always has a visible display name for each customer.
  const customers = await Promise.all(
    rows.map(async (c) => {
      if (c.full_name && c.full_name.trim()) return c;

      try {
        const res = await db.auth.admin.getUserById(c.id);
        const email = res.data.user?.email || "";
        const fallbackName = email ? email.split("@")[0] : "Customer";
        return { ...c, full_name: fallbackName };
      } catch {
        return { ...c, full_name: "Customer" };
      }
    }),
  );

  return NextResponse.json({ customers });
}
