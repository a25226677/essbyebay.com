import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET() {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { data, error } = await db.from("shipping_config").select("*");
    if (error) throw error;
    const config: Record<string, string> = {};
    (data||[]).forEach((r:any) => { config[r.config_key] = r.config_value; });
    return NextResponse.json({ data: config });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const body = await req.json();
    for (const [key, value] of Object.entries(body as Record<string,string>)) {
      await db.from("shipping_config").upsert({ config_key: key, config_value: String(value), updated_at: new Date().toISOString() }, { onConflict: "config_key" });
    }
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
