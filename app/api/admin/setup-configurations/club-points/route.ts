import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET() {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const [config, transactions] = await Promise.all([
      db.from("club_point_config").select("*"),
      db.from("club_point_transactions").select("*, profiles!club_point_transactions_user_id_fkey(full_name,avatar_url)").order("created_at",{ascending:false}).limit(50),
    ]);
    const cfg: Record<string,string> = {};
    (config.data||[]).forEach((r:any)=>{ cfg[r.config_key]=r.config_value; });
    return NextResponse.json({ config: cfg, transactions: transactions.data||[] });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const body = await req.json();
    for (const [key, value] of Object.entries(body as Record<string,string>)) {
      await db.from("club_point_config").upsert({ config_key: key, config_value: String(value), updated_at: new Date().toISOString() }, { onConflict: "config_key" });
    }
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
