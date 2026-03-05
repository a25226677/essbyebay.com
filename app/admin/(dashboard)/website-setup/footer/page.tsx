"use client";
import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
export default function FooterSettingsPage() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify = (msg:string,ok=true)=>{ setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };
  useEffect(()=>{
    fetch("/api/admin/website-setup").then(r=>r.json()).then(j=>{ setSettings(j.data||{}); }).finally(()=>setLoading(false));
  },[]);
  const set = (k:string,v:string)=>setSettings(s=>({...s,[k]:v}));
  const handleSave = async ()=>{
    setSaving(true);
    try {
      const res = await fetch("/api/admin/website-setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});
      if (!res.ok) throw new Error("Failed");
      notify("Footer settings saved");
    } catch { notify("Error",false); } finally { setSaving(false); }
  };
  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-800">Footer Settings</h2>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">About Text</label>
          <textarea value={settings.footer_about||""} onChange={e=>set("footer_about",e.target.value)} rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"
            placeholder="Short about description for footer…"/>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Copyright Text</label>
          <input value={settings.footer_copyright||""} onChange={e=>set("footer_copyright",e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            placeholder="© 2026 StoreBay. All rights reserved." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {["facebook","twitter","instagram","youtube"].map(s=>(
            <div key={s}>
              <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">{s} URL</label>
              <input value={settings[`social_${s}`]||""} onChange={e=>set(`social_${s}`,e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                placeholder={`https://${s}.com/...`} />
            </div>
          ))}
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
