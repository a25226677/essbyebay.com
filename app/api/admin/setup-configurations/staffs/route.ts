import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")||"";
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("staffs").select("*",{count:"exact"});
    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    const {data,error,count} = await query.order("created_at",{ascending:false}).range(from,from+perPage-1);
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { full_name, email, phone, role, permissions } = await req.json();
    const {data,error} = await db.from("staffs").insert({full_name,email,phone,role:role||"staff",permissions:permissions||{}}).select().single();
    if (error) throw error;
    return NextResponse.json({data});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function PATCH(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const {id,...body} = await req.json();
    const {data,error} = await db.from("staffs").update({...body,updated_at:new Date().toISOString()}).eq("id",id).select().single();
    if (error) throw error;
    return NextResponse.json({data});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function DELETE(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const {error} = await db.from("staffs").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({success:true});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
