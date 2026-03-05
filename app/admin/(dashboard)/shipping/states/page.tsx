"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, X } from "lucide-react";
interface State { id:string; name:string; state_code:string|null; is_active:boolean; shipping_countries?:{name:string;code:string}; }
interface Country { id:string; name:string; code:string; }
export default function ShippingStatesPage() {
  const [data, setData] = useState<State[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [filterCountry, setFilterCountry] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({country_id:"",name:"",state_code:""});
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(m:string,ok=true)=>{setToast({msg:m,ok});setTimeout(()=>setToast(null),3000);};
  const perPage = 20;
  const fetchData=useCallback(async()=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({page:String(page)});
      if(filterCountry) params.set("country_id",filterCountry);
      const r=await fetch(`/api/admin/shipping/states?${params}`);
      const j=await r.json();
      setData(j.data||[]);setTotal(j.total||0);
    }finally{setLoading(false);}
  },[page,filterCountry]);
  useEffect(()=>{
    fetch("/api/admin/shipping/countries?page=1").then(r=>r.json()).then(j=>setCountries((j.data||[]).slice(0,50)));
    fetchData();
  },[fetchData]);
  const handleAdd=async()=>{
    if(!form.country_id||!form.name) return notify("Country and name required",false);
    try{
      const res=await fetch("/api/admin/shipping/states",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      if(!res.ok) throw new Error();
      notify("State added");setShowModal(false);setForm({country_id:"",name:"",state_code:""});fetchData();
    }catch{notify("Error",false);}
  };
  const handleDelete=async(id:string)=>{
    if(!confirm("Delete?"))return;
    await fetch(`/api/admin/shipping/states?id=${id}`,{method:"DELETE"});
    notify("Deleted");fetchData();
  };
  const totalPages=Math.ceil(total/perPage);
  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="flex items-center justify-between mb-5">
        <select value={filterCountry} onChange={e=>{setFilterCountry(e.target.value);setPage(1);}}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 min-w-[200px]">
          <option value="">All Countries</option>
          {countries.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
        </select>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
          <Plus className="size-4"/>Add State
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">State Name</th>
            <th className="px-4 py-3 text-left">Code</th>
            <th className="px-4 py-3 text-left">Country</th>
            <th className="px-4 py-3 text-right">Options</th>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
            :data.length===0?<tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No states found</td></tr>
            :data.map((s,i)=>(
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{(page-1)*perPage+i+1}</td>
                <td className="px-4 py-3 text-gray-800">{s.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.state_code||"—"}</td>
                <td className="px-4 py-3 text-gray-600">{s.shipping_countries?.name||"—"}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={()=>handleDelete(s.id)} className="p-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600"><Trash2 className="size-3.5"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages>1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">‹</button>
            {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={`px-2.5 py-1 text-xs rounded ${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}`}>{p}</button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">›</button>
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Add State</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5"/></button>
            </div>
            <div className="p-5 space-y-3">
              <select value={form.country_id} onChange={e=>setForm(f=>({...f,country_id:e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
                <option value="">Select Country</option>
                {countries.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="State Name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
              <input value={form.state_code} onChange={e=>setForm(f=>({...f,state_code:e.target.value.toUpperCase()}))} placeholder="State Code (optional)"
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
