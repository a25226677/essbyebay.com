import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET() {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { data, error } = await db.from("website_settings").select("*");
    if (error) throw error;
    const settings: Record<string, string> = {};
    (data||[]).forEach((r:any) => { settings[r.setting_key] = r.setting_value; });
    return NextResponse.json({ data: settings });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const body = await req.json();
    const entries = Object.entries(body as Record<string,string>);
    for (const [key, value] of entries) {
      await db.from("website_settings").upsert({ setting_key: key, setting_value: String(value), updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
    }
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
