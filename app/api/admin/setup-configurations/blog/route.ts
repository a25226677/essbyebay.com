import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "posts";
    const page = Math.max(1, parseInt(searchParams.get("page")||"1"));
    const perPage = 15; const from = (page-1)*perPage;
    if (type === "categories") {
      const {data,error,count} = await db.from("blog_categories").select("*",{count:"exact"}).order("name").range(from,from+perPage-1);
      if (error) throw error;
      return NextResponse.json({
        data:data||[],
        pagination: { page, limit: perPage, total: count||0, pages: Math.ceil((count||0)/perPage) }
      });
    }
    const {data,error,count} = await db.from("blog_posts")
      .select("*, blog_categories!blog_posts_category_id_fkey(name)",{count:"exact"})
      .order("created_at",{ascending:false}).range(from,from+perPage-1);
    if (error) throw error;
    return NextResponse.json({
      data:data||[],
      pagination: { page, limit: perPage, total: count||0, pages: Math.ceil((count||0)/perPage) }
    });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function POST(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const body = await req.json();
    if (body.type === "category") {
      const {data,error} = await db.from("blog_categories").insert({name:body.name,slug:body.slug}).select().single();
      if (error) throw error;
      return NextResponse.json({data});
    }
    const {data,error} = await db.from("blog_posts").insert({title:body.title,slug:body.slug,content:body.content,thumbnail_url:body.thumbnail_url,category_id:body.category_id||null,is_published:body.is_published||false}).select().single();
    if (error) throw error;
    return NextResponse.json({data});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function PATCH(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const body = await req.json();
    const {id,...updates} = body;
    const table = updates.type === "category" ? "blog_categories" : "blog_posts";
    delete updates.type;
    const {data,error} = await db.from(table).update({...updates,updated_at:new Date().toISOString()}).eq("id",id).select().single();
    if (error) throw error;
    return NextResponse.json({data});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function DELETE(req: NextRequest) {
  try {
    const _ctx = await getAdminContext(); if (_ctx instanceof NextResponse) return _ctx; const { db } = _ctx;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type")||"post";
    const table = type === "category" ? "blog_categories" : "blog_posts";
    const {error} = await db.from(table).delete().eq("id", id!);
    if (error) throw error;
    return NextResponse.json({success:true});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
