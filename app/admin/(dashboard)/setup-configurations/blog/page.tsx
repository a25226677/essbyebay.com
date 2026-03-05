"use client";
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
  const handleDeletePost=async(id:string)=>{ if(!confirm("Delete post?"))return; await fetch(`/api/admin/setup-configurations/blog?id=${id}&type=post`,{method:"DELETE"}); notify("Deleted"); fetchPosts(); };
  const handleDeleteCat=async(id:string)=>{ if(!confirm("Delete category?"))return; await fetch(`/api/admin/setup-configurations/blog?id=${id}&type=category`,{method:"DELETE"}); notify("Deleted"); fetchCats(); };

  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="flex items-center justify-between mb-5">
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          <button onClick={()=>setTab("posts")} className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${tab==="posts"?"bg-orange-500 text-white":"text-gray-600 hover:bg-gray-50"}`}>Posts</button>
          <button onClick={()=>setTab("categories")} className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${tab==="categories"?"bg-orange-500 text-white":"text-gray-600 hover:bg-gray-50"}`}>Categories</button>
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
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.is_published?"bg-emerald-50 text-emerald-600":"bg-gray-100 text-gray-500"}`}>{p.is_published?"Published":"Draft"}</span></td>
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
