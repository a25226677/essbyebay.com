import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page")||"1"));
    const perPage = 24; const from = (page-1)*perPage;
    const {data,error,count} = await db.from("uploaded_files")
      .select("*",{count:"exact"}).order("created_at",{ascending:false}).range(from,from+perPage-1);
    if (error) throw error;
    return NextResponse.json({
      data:data||[],
      pagination: { page, limit: perPage, total: count||0, pages: Math.ceil((count||0)/perPage) }
    });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db, userId } = _ctx;
    const { file_name, file_url, file_size, mime_type } = await req.json();
    const {data,error} = await db.from("uploaded_files")
      .insert({file_name,file_url,file_size:file_size||0,mime_type:mime_type||"image/jpeg",uploaded_by:userId})
      .select().single();
    if (error) throw error;
    return NextResponse.json({data});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function DELETE(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const {error} = await db.from("uploaded_files").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({success:true});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
