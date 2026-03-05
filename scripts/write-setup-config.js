const fs = require("fs");
const path = require("path");
const base = path.join(__dirname, "..");
function write(relPath, content) {
  const full = path.join(base, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("Written:", relPath);
}

// ─── API: Club Points ─────────────────────────────────────────────────────
write("app/api/admin/setup-configurations/club-points/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET() {
  try {
    const { db } = await getAdminContext();
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
    const { db } = await getAdminContext();
    const body = await req.json();
    for (const [key, value] of Object.entries(body as Record<string,string>)) {
      await db.from("club_point_config").upsert({ config_key: key, config_value: String(value), updated_at: new Date().toISOString() }, { onConflict: "config_key" });
    }
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

// ─── API: Blog System ─────────────────────────────────────────────────────
write("app/api/admin/setup-configurations/blog/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "posts";
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 15; const from = (page-1)*perPage;
    if (type === "categories") {
      const {data,error,count} = await db.from("blog_categories").select("*",{count:"exact"}).order("name").range(from,from+perPage-1);
      if (error) throw error;
      return NextResponse.json({data:data||[],total:count||0});
    }
    const {data,error,count} = await db.from("blog_posts")
      .select("*, blog_categories!blog_posts_category_id_fkey(name)",{count:"exact"})
      .order("created_at",{ascending:false}).range(from,from+perPage-1);
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function POST(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
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
    const { db } = await getAdminContext();
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
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type")||"post";
    const table = type === "category" ? "blog_categories" : "blog_posts";
    const {error} = await db.from(table).delete().eq("id", id!);
    if (error) throw error;
    return NextResponse.json({success:true});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

// ─── API: Staffs ──────────────────────────────────────────────────────────
write("app/api/admin/setup-configurations/staffs/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")||"";
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("staffs").select("*",{count:"exact"});
    if (search) query = query.or(\`full_name.ilike.%\${search}%,email.ilike.%\${search}%\`);
    const {data,error,count} = await query.order("created_at",{ascending:false}).range(from,from+perPage-1);
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function POST(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { full_name, email, phone, role, permissions } = await req.json();
    const {data,error} = await db.from("staffs").insert({full_name,email,phone,role:role||"staff",permissions:permissions||{}}).select().single();
    if (error) throw error;
    return NextResponse.json({data});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function PATCH(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const {id,...body} = await req.json();
    const {data,error} = await db.from("staffs").update({...body,updated_at:new Date().toISOString()}).eq("id",id).select().single();
    if (error) throw error;
    return NextResponse.json({data});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function DELETE(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const {error} = await db.from("staffs").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({success:true});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

// ─── API: Uploaded Files ──────────────────────────────────────────────────
write("app/api/admin/setup-configurations/uploaded-files/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 24; const from = (page-1)*perPage;
    const {data,error,count} = await db.from("uploaded_files")
      .select("*",{count:"exact"}).order("created_at",{ascending:false}).range(from,from+perPage-1);
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function POST(req: NextRequest) {
  try {
    const { db, userId } = await getAdminContext();
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
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const {error} = await db.from("uploaded_files").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({success:true});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

// ─── PAGE: Club Point System ──────────────────────────────────────────────
write("app/admin/(dashboard)/setup-configurations/club-points/page.tsx", `"use client";
import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
function Toggle({checked,onChange}:{checked:boolean;onChange:(v:boolean)=>void}){
  return(<button onClick={()=>onChange(!checked)} className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${checked?"bg-emerald-500":"bg-gray-300"}\`}><span className={\`inline-block size-5 transform rounded-full bg-white shadow transition-transform \${checked?"translate-x-5":"translate-x-0.5"}\`}/></button>);
}
export default function ClubPointSystemPage() {
  const [config, setConfig] = useState<Record<string,string>>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(m:string,ok=true)=>{setToast({msg:m,ok});setTimeout(()=>setToast(null),3000);};
  useEffect(()=>{
    fetch("/api/admin/setup-configurations/club-points").then(r=>r.json()).then(j=>{
      setConfig(j.config||{}); setTransactions(j.transactions||[]);
    }).finally(()=>setLoading(false));
  },[]);
  const set=(k:string,v:string)=>setConfig(c=>({...c,[k]:v}));
  const handleSave=async()=>{
    setSaving(true);
    try {
      const res=await fetch("/api/admin/setup-configurations/club-points",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(config)});
      if(!res.ok) throw new Error();
      notify("Club point config saved");
    }catch{notify("Error",false);}finally{setSaving(false);}
  };
  if(loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Club Point System Settings</h2>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-700">Enable Club Points</span>
            <Toggle checked={config.points_enabled==="true"} onChange={v=>set("points_enabled",String(v))}/>
          </div>
          {[
            {key:"points_per_purchase",label:"Points per Purchase (₹100)"},
            {key:"points_value",label:"1 Point Value (in currency)"},
            {key:"min_redeem_points",label:"Minimum Redeem Points"},
            {key:"max_redeem_per_order",label:"Max Redeem per Order"},
            {key:"expiry_days",label:"Points Expiry (days)"},
          ].map(({key,label})=>(
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              <input value={config[key]||""} onChange={e=>set(key,e.target.value)} type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
              <Save className="size-4"/>{saving?"Saving…":"Update"}
            </button>
          </div>
        </div>
        {/* Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-800">Recent Point Transactions</h2></div>
          <div className="overflow-y-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-right">Points</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-right">Date</th>
              </tr></thead>
              <tbody>
                {transactions.length===0?<tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No transactions</td></tr>
                :transactions.map((t:any)=>(
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-gray-800 text-xs">{t.profiles?.full_name||"Unknown"}</td>
                    <td className="px-4 py-2 text-right font-semibold text-xs \${t.type==='earn'?'text-emerald-600':'text-red-500'}">{t.type==="earn"?"+":"-"}{Math.abs(t.points)}</td>
                    <td className="px-4 py-2 text-xs capitalize text-gray-500">{t.type}</td>
                    <td className="px-4 py-2 text-right text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
`);

// ─── PAGE: Blog System ────────────────────────────────────────────────────
write("app/admin/(dashboard)/setup-configurations/blog/page.tsx", `"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Tag } from "lucide-react";
interface Post { id:string; title:string; slug:string; is_published:boolean; views:number; created_at:string; blog_categories?:{name:string}; }
interface Category { id:string; name:string; slug:string; is_active:boolean; }
export default function BlogSystemPage() {
  const [tab, setTab] = useState<"posts"|"categories">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post|null>(null);
  const [editingCat, setEditingCat] = useState<Category|null>(null);
  const [postForm, setPostForm] = useState({title:"",slug:"",content:"",thumbnail_url:"",category_id:"",is_published:false});
  const [catForm, setCatForm] = useState({name:"",slug:""});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(m:string,ok=true)=>{setToast({msg:m,ok});setTimeout(()=>setToast(null),3000);};

  const fetchPosts=useCallback(async()=>{
    setLoading(true);
    const r=await fetch("/api/admin/setup-configurations/blog?type=posts");
    const j=await r.json(); setPosts(j.data||[]); setLoading(false);
  },[]);
  const fetchCats=useCallback(async()=>{
    setLoading(true);
    const r=await fetch("/api/admin/setup-configurations/blog?type=categories");
    const j=await r.json(); setCategories(j.data||[]); setLoading(false);
  },[]);

  useEffect(()=>{
    if(tab==="posts") fetchPosts(); else fetchCats();
  },[tab,fetchPosts,fetchCats]);

  const handleSavePost=async()=>{
    if(!postForm.title) return notify("Title required",false);
    setSaving(true);
    try{
      const method=editingPost?"PATCH":"POST";
      const body=editingPost?{id:editingPost.id,...postForm}:postForm;
      const res=await fetch("/api/admin/setup-configurations/blog",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!res.ok) throw new Error();
      notify(editingPost?"Updated":"Created"); setShowModal(false); fetchPosts();
    }catch{notify("Error",false);}finally{setSaving(false);}
  };
  const handleSaveCat=async()=>{
    if(!catForm.name) return notify("Name required",false);
    setSaving(true);
    try{
      const body=editingCat?{id:editingCat.id,...catForm,type:"category"}:{...catForm,type:"category"};
      const res=await fetch("/api/admin/setup-configurations/blog",{method:editingCat?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!res.ok) throw new Error();
      notify(editingCat?"Updated":"Created"); setShowModal(false); fetchCats();
    }catch{notify("Error",false);}finally{setSaving(false);}
  };
  const handleDeletePost=async(id:string)=>{ if(!confirm("Delete post?"))return; await fetch(\`/api/admin/setup-configurations/blog?id=\${id}&type=post\`,{method:"DELETE"}); notify("Deleted"); fetchPosts(); };
  const handleDeleteCat=async(id:string)=>{ if(!confirm("Delete category?"))return; await fetch(\`/api/admin/setup-configurations/blog?id=\${id}&type=category\`,{method:"DELETE"}); notify("Deleted"); fetchCats(); };

  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
      <div className="flex items-center justify-between mb-5">
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          <button onClick={()=>setTab("posts")} className={\`px-4 py-1.5 text-sm rounded-md font-medium transition-colors \${tab==="posts"?"bg-orange-500 text-white":"text-gray-600 hover:bg-gray-50"}\`}>Posts</button>
          <button onClick={()=>setTab("categories")} className={\`px-4 py-1.5 text-sm rounded-md font-medium transition-colors \${tab==="categories"?"bg-orange-500 text-white":"text-gray-600 hover:bg-gray-50"}\`}>Categories</button>
        </div>
        <button onClick={()=>{ setEditingPost(null);setEditingCat(null);setPostForm({title:"",slug:"",content:"",thumbnail_url:"",category_id:"",is_published:false});setCatForm({name:"",slug:""});setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
          <Plus className="size-4"/>{tab==="posts"?"Add Post":"Add Category"}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {tab==="posts" ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-right">Views</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Options</th>
            </tr></thead>
            <tbody>
              {loading?<tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              :posts.length===0?<tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No posts yet</td></tr>
              :posts.map((p,i)=>(
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{i+1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.title}</td>
                  <td className="px-4 py-3 text-gray-500">{p.blog_categories?.name||"Uncategorized"}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.views}</td>
                  <td className="px-4 py-3"><span className={\`px-2 py-0.5 rounded text-[10px] font-medium \${p.is_published?"bg-emerald-50 text-emerald-600":"bg-gray-100 text-gray-500"}\`}>{p.is_published?"Published":"Draft"}</span></td>
                  <td className="px-4 py-3"><div className="flex items-center justify-end gap-2">
                    <button onClick={()=>{setEditingPost(p);setPostForm({title:p.title,slug:p.slug,content:"",thumbnail_url:"",category_id:"",is_published:p.is_published});setShowModal(true);}} className="p-1.5 rounded-md border border-orange-200 bg-orange-50 text-orange-600"><Pencil className="size-3.5"/></button>
                    <button onClick={()=>handleDeletePost(p.id)} className="p-1.5 rounded-md border border-red-200 bg-red-50 text-red-600"><Trash2 className="size-3.5"/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-right">Options</th>
            </tr></thead>
            <tbody>
              {loading?<tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              :categories.length===0?<tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No categories</td></tr>
              :categories.map((c,i)=>(
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{i+1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2"><Tag className="size-3.5 text-orange-400"/>{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">/{c.slug}</td>
                  <td className="px-4 py-3"><div className="flex items-center justify-end gap-2">
                    <button onClick={()=>{setEditingCat(c);setCatForm({name:c.name,slug:c.slug});setShowModal(true);}} className="p-1.5 rounded-md border border-orange-200 bg-orange-50 text-orange-600"><Pencil className="size-3.5"/></button>
                    <button onClick={()=>handleDeleteCat(c.id)} className="p-1.5 rounded-md border border-red-200 bg-red-50 text-red-600"><Trash2 className="size-3.5"/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{tab==="posts"?(editingPost?"Edit Post":"New Post"):(editingCat?"Edit Category":"New Category")}</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5"/></button>
            </div>
            {tab==="posts"?(
              <div className="p-5 space-y-3">
                <input value={postForm.title} onChange={e=>setPostForm(f=>({...f,title:e.target.value}))} placeholder="Title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
                <input value={postForm.slug} onChange={e=>setPostForm(f=>({...f,slug:e.target.value}))} placeholder="slug"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"/>
                <input value={postForm.thumbnail_url} onChange={e=>setPostForm(f=>({...f,thumbnail_url:e.target.value}))} placeholder="Thumbnail URL"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
                <textarea value={postForm.content} onChange={e=>setPostForm(f=>({...f,content:e.target.value}))} rows={5} placeholder="Content…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"/>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={postForm.is_published} onChange={e=>setPostForm(f=>({...f,is_published:e.target.checked}))} className="accent-orange-500"/> Published
                </label>
              </div>
            ):(
              <div className="p-5 space-y-3">
                <input value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))} placeholder="Category Name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
                <input value={catForm.slug} onChange={e=>setCatForm(f=>({...f,slug:e.target.value}))} placeholder="slug"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"/>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={tab==="posts"?handleSavePost:handleSaveCat} disabled={saving}
                className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60">{saving?"Saving…":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ─── PAGE: Staffs ─────────────────────────────────────────────────────────
write("app/admin/(dashboard)/setup-configurations/staffs/page.tsx", `"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, X, ShieldCheck } from "lucide-react";
interface Staff { id:string; full_name:string; email:string; phone:string|null; role:string; is_active:boolean; created_at:string; }
export default function StaffsPage() {
  const [data, setData] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Staff|null>(null);
  const [form, setForm] = useState({full_name:"",email:"",phone:"",role:"staff"});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(m:string,ok=true)=>{setToast({msg:m,ok});setTimeout(()=>setToast(null),3000);};

  const fetchData=useCallback(async()=>{
    setLoading(true);
    const params=new URLSearchParams({page:"1"}); if(search) params.set("search",search);
    const r=await fetch(\`/api/admin/setup-configurations/staffs?\${params}\`);
    const j=await r.json(); setData(j.data||[]); setLoading(false);
  },[search]);

  useEffect(()=>{fetchData();},[fetchData]);

  const openAdd=()=>{setEditing(null);setForm({full_name:"",email:"",phone:"",role:"staff"});setShowModal(true);};
  const openEdit=(s:Staff)=>{setEditing(s);setForm({full_name:s.full_name,email:s.email,phone:s.phone||"",role:s.role});setShowModal(true);};
  const handleSave=async()=>{
    if(!form.full_name||!form.email) return notify("Name and email required",false);
    setSaving(true);
    try{
      const method=editing?"PATCH":"POST";
      const body=editing?{id:editing.id,...form}:form;
      const res=await fetch("/api/admin/setup-configurations/staffs",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!res.ok) throw new Error();
      notify(editing?"Updated":"Added"); setShowModal(false); fetchData();
    }catch{notify("Error",false);}finally{setSaving(false);}
  };
  const handleDelete=async(id:string)=>{
    if(!confirm("Delete staff?"))return;
    await fetch(\`/api/admin/setup-configurations/staffs?id=\${id}\`,{method:"DELETE"});
    notify("Deleted"); fetchData();
  };
  const ROLE_COLORS:Record<string,string> = { admin:"bg-purple-50 text-purple-600", manager:"bg-blue-50 text-blue-600", staff:"bg-gray-100 text-gray-600" };

  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
      <div className="flex items-center justify-between mb-5">
        <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchData()}
          placeholder="Search staff…" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:border-orange-400"/>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
          <Plus className="size-4"/>Add Staff
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ShieldCheck className="size-4 text-orange-500"/>
          <h2 className="text-base font-semibold text-gray-800">Staffs</h2>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Phone</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Options</th>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
            :data.length===0?<tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No staff found</td></tr>
            :data.map((s,i)=>(
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{i+1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{s.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{s.email}</td>
                <td className="px-4 py-3 text-gray-500">{s.phone||"—"}</td>
                <td className="px-4 py-3"><span className={\`px-2 py-0.5 rounded text-[10px] font-medium \${ROLE_COLORS[s.role]||"bg-gray-100 text-gray-600"}\`}>{s.role}</span></td>
                <td className="px-4 py-3"><span className={\`px-2 py-0.5 rounded text-[10px] font-medium \${s.is_active?"bg-emerald-50 text-emerald-600":"bg-red-50 text-red-500"}\`}>{s.is_active?"Active":"Inactive"}</span></td>
                <td className="px-4 py-3"><div className="flex items-center justify-end gap-2">
                  <button onClick={()=>openEdit(s)} className="p-1.5 rounded-md border border-orange-200 bg-orange-50 text-orange-600"><Pencil className="size-3.5"/></button>
                  <button onClick={()=>handleDelete(s.id)} className="p-1.5 rounded-md border border-red-200 bg-red-50 text-red-600"><Trash2 className="size-3.5"/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editing?"Edit Staff":"Add Staff"}</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5"/></button>
            </div>
            <div className="p-5 space-y-3">
              <input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} placeholder="Full Name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
              <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="Email" type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
              <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="Phone (optional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
              <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60">{saving?"Saving…":"Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ─── PAGE: Uploaded Files ─────────────────────────────────────────────────
write("app/admin/(dashboard)/setup-configurations/uploaded-files/page.tsx", `"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Trash2, MoreVertical, Copy, ExternalLink, RefreshCcw, Upload } from "lucide-react";
interface UploadedFile { id:string; file_name:string; file_url:string; file_size:number; mime_type:string; created_at:string; }
function formatSize(bytes:number) {
  if(bytes<1024) return bytes+"B"; if(bytes<1024*1024) return (bytes/1024).toFixed(2)+"KB";
  return (bytes/(1024*1024)).toFixed(2)+"MB";
}
export default function UploadedFilesPage() {
  const [data, setData] = useState<UploadedFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string|null>(null);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(m:string,ok=true)=>{setToast({msg:m,ok});setTimeout(()=>setToast(null),3000);};
  const perPage=24;

  const fetchData=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await fetch(\`/api/admin/setup-configurations/uploaded-files?page=\${page}\`);
      const j=await r.json(); setData(j.data||[]); setTotal(j.total||0);
    }finally{setLoading(false);}
  },[page]);

  useEffect(()=>{ fetchData(); },[fetchData]);

  // Close menu when clicking outside
  useEffect(()=>{
    const h=()=>setOpenMenu(null);
    document.addEventListener("click",h);
    return ()=>document.removeEventListener("click",h);
  },[]);

  const handleDelete=async(id:string)=>{
    if(!confirm("Delete file?"))return;
    await fetch(\`/api/admin/setup-configurations/uploaded-files?id=\${id}\`,{method:"DELETE"});
    notify("Deleted"); fetchData();
  };

  const handleCopy=(url:string)=>{ navigator.clipboard.writeText(url); notify("URL copied"); };

  const totalPages=Math.ceil(total/perPage);

  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-base font-semibold text-gray-800">Uploaded Files</h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><RefreshCcw className="size-4"/></button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : data.length===0 ? (
        <div className="text-center py-20 text-gray-400">No uploaded files</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {data.map(file=>(
            <div key={file.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              {/* Image */}
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                {file.mime_type.startsWith("image/") ? (
                  <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Upload className="size-8"/>
                  </div>
                )}
                {/* Menu button */}
                <div className="absolute top-1.5 right-1.5">
                  <button onClick={e=>{e.stopPropagation();setOpenMenu(openMenu===file.id?null:file.id);}}
                    className="p-1 rounded bg-white/80 hover:bg-white shadow-sm text-gray-600">
                    <MoreVertical className="size-3.5"/>
                  </button>
                  {openMenu===file.id && (
                    <div className="absolute right-0 top-7 bg-white rounded-lg shadow-xl border border-gray-100 z-20 w-36 py-1" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>handleCopy(file.file_url)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <Copy className="size-3"/>Copy URL
                      </button>
                      <a href={file.file_url} target="_blank" rel="noopener" className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                        <ExternalLink className="size-3"/>Open
                      </a>
                      <button onClick={()=>handleDelete(file.id)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
                        <Trash2 className="size-3"/>Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* Info */}
              <div className="px-2 py-1.5">
                <p className="text-[10px] text-gray-700 truncate font-medium" title={file.file_name}>{file.file_name}</p>
                <p className="text-[10px] text-gray-400">{formatSize(file.file_size)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages>1 && (
        <div className="mt-6 flex items-center justify-center gap-1">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">‹</button>
          {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(p=>(
            <button key={p} onClick={()=>setPage(p)} className={\`px-2.5 py-1 text-xs rounded \${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}\`}>{p}</button>
          ))}
          {totalPages>10 && <span className="text-xs text-gray-400">… {totalPages}</span>}
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">›</button>
        </div>
      )}
    </div>
  );
}
`);

// ─── Redirect: setup-configurations page ────────────────────────────────
write("app/admin/(dashboard)/setup-configurations/page.tsx", `import { redirect } from "next/navigation";
export default function SetupConfigurationsPage() { redirect("/admin/setup-configurations/club-points"); }
`);

console.log("\\n✅ Setup & Configurations done");
