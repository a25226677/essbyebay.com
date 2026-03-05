"use client";
import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked?"bg-emerald-500":"bg-gray-300"}`}>
      <span className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${checked?"translate-x-5":"translate-x-0.5"}`}/>
    </button>
  );
}
const FEATURES = [
  {key:"features_wishlist",label:"Wishlist Feature",desc:"Allow users to save products to wishlist"},
  {key:"features_reviews",label:"Product Reviews",desc:"Allow customers to write product reviews"},
  {key:"features_affiliate",label:"Affiliate System",desc:"Enable affiliate referral system"},
  {key:"features_wallet",label:"Wallet System",desc:"Enable user wallet and balance top-up"},
  {key:"features_compare",label:"Product Compare",desc:"Allow users to compare products"},
  {key:"features_live_chat",label:"Live Chat",desc:"Enable live chat support widget"},
  {key:"features_newsletter",label:"Newsletter Signup",desc:"Show newsletter subscription form"},
  {key:"features_pos",label:"POS System",desc:"Enable point-of-sale terminal for offline orders"},
];
export default function FeaturesActivationPage() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(msg:string,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};
  useEffect(()=>{
    fetch("/api/admin/website-setup").then(r=>r.json()).then(j=>setSettings(j.data||{})).finally(()=>setLoading(false));
  },[]);
  const handleSave=async()=>{
    setSaving(true);
    try {
      const res=await fetch("/api/admin/website-setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(settings)});
      if(!res.ok) throw new Error();
      notify("Features updated");
    } catch{notify("Error",false);}finally{setSaving(false);}
  };
  if(loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5">Features Activation</h2>
        <div className="space-y-1">
          {FEATURES.map(({key,label,desc})=>(
            <div key={key} className="flex items-center justify-between py-3.5 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <Toggle checked={settings[key]==="true"} onChange={v=>setSettings(s=>({...s,[key]:String(v)}))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-5">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            <Save className="size-4"/>{saving?"Saving…":"Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
