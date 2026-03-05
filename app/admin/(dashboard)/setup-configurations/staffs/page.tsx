"use client";
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
    const r=await fetch(`/api/admin/setup-configurations/staffs?${params}`);
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
    await fetch(`/api/admin/setup-configurations/staffs?id=${id}`,{method:"DELETE"});
    notify("Deleted"); fetchData();
  };
  const ROLE_COLORS:Record<string,string> = { admin:"bg-purple-50 text-purple-600", manager:"bg-blue-50 text-blue-600", staff:"bg-gray-100 text-gray-600" };

  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
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
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${ROLE_COLORS[s.role]||"bg-gray-100 text-gray-600"}`}>{s.role}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${s.is_active?"bg-emerald-50 text-emerald-600":"bg-red-50 text-red-500"}`}>{s.is_active?"Active":"Inactive"}</span></td>
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
