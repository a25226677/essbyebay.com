import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp   = request.nextUrl.searchParams;
  const type = sp.get("type") || "";
  const uid  = sp.get("user_id") || "";
  const page  = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("wallet_transactions")
    .select("id, user_id, amount, type, note, created_at, profiles(id, full_name, phone)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type);
  if (uid)  query = query.eq("user_id", uid);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data || [],
    pagination: { page, limit, total: count ?? 0, pages: Math.max(1, Math.ceil((count ?? 0) / limit)) },
  });
}
