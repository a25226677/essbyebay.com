"use client";
import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
interface Page { id: string; title: string; slug: string; content: string; is_published: boolean; created_at: string; }
export default function PagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Page|null>(null);
  const [form, setForm] = useState({title:"",slug:"",content:"",is_published:true});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(msg:string,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};
  const fetch_ = async ()=>{
    setLoading(true);
    try { const r=await fetch("/api/admin/website-setup/pages"); const j=await r.json(); setPages(j.data||[]); } finally{setLoading(false);}
  };
  useEffect(()=>{fetch_();},[]);
  const openAdd=()=>{ setEditing(null);setForm({title:"",slug:"",content:"",is_published:true});setShowModal(true); };
  const openEdit=(p:Page)=>{ setEditing(p);setForm({title:p.title,slug:p.slug,content:p.content,is_published:p.is_published});setShowModal(true); };
  const handleSave=async()=>{
    if(!form.title) return notify("Title required",false);
    setSaving(true);
    try {
      const method=editing?"PATCH":"POST";
      const body=editing?{id:editing.id,...form}:form;
      const res=await fetch("/api/admin/website-setup/pages",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!res.ok) throw new Error();
      notify(editing?"Updated":"Created");
      setShowModal(false); fetch_();
    } catch{notify("Error",false);}finally{setSaving(false);}
  };
  const handleDelete=async(id:string)=>{
    if(!confirm("Delete page?"))return;
    await fetch(`/api/admin/website-setup/pages?id=${id}`,{method:"DELETE"});
    notify("Deleted"); fetch_();
  };
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="flex justify-end mb-5">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
          <Plus className="size-4"/> Add New Page
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-800">Pages</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">Title</th>
            <th className="px-4 py-3 text-left">Slug</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Options</th>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
            :pages.length===0?<tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No pages yet</td></tr>
            :pages.map((p,i)=>(
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{i+1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{p.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">/{p.slug}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${p.is_published?"bg-emerald-50 text-emerald-600":"bg-gray-100 text-gray-500"}`}>{p.is_published?"Published":"Draft"}</span></td>
                <td className="px-4 py-3"><div className="flex items-center justify-end gap-2">
                  <button onClick={()=>openEdit(p)} className="p-1.5 rounded-md border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600"><Pencil className="size-3.5"/></button>
                  <button onClick={()=>handleDelete(p.id)} className="p-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600"><Trash2 className="size-3.5"/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editing?"Edit Page":"New Page"}</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Page Title"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
              <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} placeholder="slug-url"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"/>
              <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={8} placeholder="Page content (HTML supported)…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none font-mono"/>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e=>setForm(f=>({...f,is_published:e.target.checked}))} className="accent-orange-500"/>
                Published
              </label>
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
