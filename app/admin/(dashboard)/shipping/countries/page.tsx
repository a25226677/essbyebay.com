"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
interface Country { id: string; name: string; code: string; is_active: boolean; }
function Toggle({checked,onChange}:{checked:boolean;onChange:(v:boolean)=>void}){
  return(<button onClick={()=>onChange(!checked)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked?"bg-emerald-500":"bg-gray-300"}`}><span className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${checked?"translate-x-4":"translate-x-0.5"}`}/></button>);
}
export default function ShippingCountriesPage() {
  const [data, setData] = useState<Country[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({name:"",code:""});
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(msg:string,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};
  const perPage = 15;

  const fetchData = useCallback(async()=>{
    setLoading(true);
    try {
      const res=await fetch(`/api/admin/shipping/countries?page=${page}`);
      const j=await res.json();
      setData(j.data||[]);setTotal(j.total||0);
    } finally{setLoading(false);}
  },[page]);

  useEffect(()=>{fetchData();},[fetchData]);

  const handleToggle=async(item:Country,val:boolean)=>{
    setData(d=>d.map(c=>c.id===item.id?{...c,is_active:val}:c));
    await fetch("/api/admin/shipping/countries",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:item.id,is_active:val})});
  };

  const handleAdd=async()=>{
    if(!form.name||!form.code) return notify("Name and code required",false);
    try{
      const res=await fetch("/api/admin/shipping/countries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      if(!res.ok) throw new Error();
      notify("Country added");setShowModal(false);setForm({name:"",code:""});fetchData();
    }catch{notify("Error",false);}
  };

  const totalPages=Math.ceil(total/perPage);

  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="flex justify-end mb-5">
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
          <Plus className="size-4"/> Add Country
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
              <th className="px-4 py-3 text-left w-12">#</th>
              <th className="px-4 py-3 text-left">Country Name</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Active</th>
            </tr></thead>
            <tbody>
              {loading?<tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              :data.map((c,i)=>(
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{(page-1)*perPage+i+1}</td>
                  <td className="px-4 py-3 text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.code}</td>
                  <td className="px-4 py-3"><Toggle checked={c.is_active} onChange={val=>handleToggle(c,val)}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages>1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">‹</button>
            {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={`px-2.5 py-1 text-xs rounded ${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}`}>{p}</button>
            ))}
            {totalPages>10 && <span className="text-xs text-gray-400">… {totalPages}</span>}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">›</button>
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Add Country</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Country Name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
              <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="Country Code (e.g. US)" maxLength={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"/>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
