import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

const SETTING_KEY = "pos_salesman_activation";

// GET: return current POS salesman activation state
export async function GET() {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const { data, error } = await db
    .from("settings")
    .select("value")
    .eq("key", SETTING_KEY)
    .single();

  if (error) {
    // table might not exist yet — return default false
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({ enabled: data?.value === true || data?.value === "true" });
}

// PUT: toggle / set POS salesman activation
export async function PUT(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const body = await request.json();
  const enabled = Boolean(body.enabled);

  const { error } = await db
    .from("settings")
    .upsert(
      { key: SETTING_KEY, value: enabled, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enabled });
}
