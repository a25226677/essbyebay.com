"use client";
import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
export default function AppearancePage() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify = (msg:string,ok=true)=>{ setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };
  useEffect(()=>{
    fetch("/api/admin/website-setup").then(r=>r.json()).then(j=>setSettings(j.data||{})).finally(()=>setLoading(false));
  },[]);
  const set=(k:string,v:string)=>setSettings(s=>({...s,[k]:v}));
  const handleSave=async()=>{
    setSaving(true);
    try {
      const res=await fetch("/api/admin/website-setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});
      if(!res.ok) throw new Error();
      notify("Appearance updated");
    } catch { notify("Error",false); } finally{setSaving(false);}
  };
  if(loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-800">Appearance Settings</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.appearance_primary_color||"#f97316"} onChange={e=>set("appearance_primary_color",e.target.value)}
                className="h-9 w-14 rounded border border-gray-200 cursor-pointer"/>
              <input value={settings.appearance_primary_color||"#f97316"} onChange={e=>set("appearance_primary_color",e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Font Family</label>
            <select value={settings.appearance_font||"Inter"} onChange={e=>set("appearance_font",e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
              {["Inter","Roboto","Poppins","Montserrat","Open Sans","Lato"].map(f=><option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">RTL Mode</label>
          <select value={settings.appearance_rtl||"ltr"} onChange={e=>set("appearance_rtl",e.target.value)}
            className="w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
            <option value="ltr">LTR (Left to Right)</option>
            <option value="rtl">RTL (Right to Left)</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            <Save className="size-4"/> {saving?"Saving…":"Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
