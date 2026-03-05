"use client";
import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
export default function GeneralSettingsPage() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(msg:string,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};
  useEffect(()=>{
    fetch("/api/admin/website-setup").then(r=>r.json()).then(j=>setSettings(j.data||{})).finally(()=>setLoading(false));
  },[]);
  const set=(k:string,v:string)=>setSettings(s=>({...s,[k]:v}));
  const handleSave=async()=>{
    setSaving(true);
    try {
      const res=await fetch("/api/admin/website-setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});
      if(!res.ok) throw new Error();
      notify("Settings saved");
    } catch{notify("Error",false);}finally{setSaving(false);}
  };
  if(loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">General Settings</h2>
        {[
          {key:"general_site_name",label:"Site Name",placeholder:"StoreBay"},
          {key:"general_site_email",label:"Contact Email",placeholder:"admin@storebay.com"},
          {key:"general_meta_title",label:"Meta Title",placeholder:"StoreBay - Online Shopping"},
          {key:"general_meta_desc",label:"Meta Description",placeholder:"Best online marketplace…"},
        ].map(({key,label,placeholder})=>(
          <div key={key}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input value={settings[key]||""} onChange={e=>set(key,e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder={placeholder}/>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
            <select value={settings.general_currency||"USD"} onChange={e=>set("general_currency",e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
              {["USD","EUR","GBP","INR","BDT","PKR","AED","SAR"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
            <select value={settings.general_timezone||"UTC"} onChange={e=>set("general_timezone",e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
              {["UTC","Asia/Kolkata","Asia/Dhaka","Asia/Karachi","Asia/Dubai","America/New_York","America/Los_Angeles","Europe/London"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            <Save className="size-4"/>{saving?"Saving…":"Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
