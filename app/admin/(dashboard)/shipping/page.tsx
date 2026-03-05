"use client";
import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
export default function ShippingConfigPage() {
  const [config, setConfig] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(msg:string,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};
  useEffect(()=>{
    fetch("/api/admin/shipping/config").then(r=>r.json()).then(j=>setConfig(j.data||{})).finally(()=>setLoading(false));
  },[]);
  const set=(k:string,v:string)=>setConfig(c=>({...c,[k]:v}));
  const handleSave=async()=>{
    setSaving(true);
    try{
      const res=await fetch("/api/admin/shipping/config",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(config)});
      if(!res.ok) throw new Error();
      notify("Shipping config saved");
    }catch{notify("Error",false);}finally{setSaving(false);}
  };
  if(loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Shipping Configuration</h2>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Shipping Type</label>
          <select value={config.shipping_type||"flat_rate"} onChange={e=>set("shipping_type",e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
            <option value="flat_rate">Flat Rate</option>
            <option value="free">Free Shipping</option>
            <option value="per_city">Per City Rate</option>
            <option value="weight_based">Weight Based</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Flat Rate Cost</label>
            <input value={config.flat_rate_cost||""} onChange={e=>set("flat_rate_cost",e.target.value)} type="number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder="50"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Free Shipping Min. Amount</label>
            <input value={config.free_shipping_min||""} onChange={e=>set("free_shipping_min",e.target.value)} type="number"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder="500"/>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Delivery Days</label>
            <input value={config.estimated_days||""} onChange={e=>set("estimated_days",e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder="3-7"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Shipping Carrier</label>
            <input value={config.shipping_carrier||""} onChange={e=>set("shipping_carrier",e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder="Default Carrier"/>
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
