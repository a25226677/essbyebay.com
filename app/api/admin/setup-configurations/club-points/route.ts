import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET() {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const [config, transResult] = await Promise.all([
      db.from("club_point_config").select("*"),
      db.from("club_point_transactions").select("*").order("created_at",{ascending:false}).limit(50),
    ]);
    const cfg: Record<string,string> = {};
    (config.data||[]).forEach((r:any)=>{ cfg[r.config_key]=r.config_value; });
    // Manual join profiles (club_point_transactions FK is to auth.users not profiles)
    const txRows = transResult.data || [];
    const uids = [...new Set(txRows.map((r:any)=>r.user_id).filter(Boolean))];
    const pMap = new Map<string,any>();
    if (uids.length > 0) {
      const { data: profs } = await db.from("profiles").select("id,full_name,avatar_url").in("id", uids);
      (profs||[]).forEach((p:any)=>pMap.set(p.id, p));
    }
    const transactions = txRows.map((r:any)=>({...r, profiles: pMap.get(r.user_id) || null}));
    return NextResponse.json({ config: cfg, transactions });
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
