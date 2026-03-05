"use client";
import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
function Toggle({checked,onChange}:{checked:boolean;onChange:(v:boolean)=>void}){
  return(<button onClick={()=>onChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked?"bg-emerald-500":"bg-gray-300"}`}><span className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${checked?"translate-x-5":"translate-x-0.5"}`}/></button>);
}
export default function ClubPointSystemPage() {
  const [config, setConfig] = useState<Record<string,string>>({});
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(m:string,ok=true)=>{setToast({msg:m,ok});setTimeout(()=>setToast(null),3000);};
  useEffect(()=>{
    fetch("/api/admin/setup-configurations/club-points").then(r=>r.json()).then(j=>{
      setConfig(j.config||{}); setTransactions(j.transactions||[]);
    }).finally(()=>setLoading(false));
  },[]);
  const set=(k:string,v:string)=>setConfig(c=>({...c,[k]:v}));
  const handleSave=async()=>{
    setSaving(true);
    try {
      const res=await fetch("/api/admin/setup-configurations/club-points",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(config)});
      if(!res.ok) throw new Error();
      notify("Club point config saved");
    }catch{notify("Error",false);}finally{setSaving(false);}
  };
  if(loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Club Point System Settings</h2>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span className="text-sm text-gray-700">Enable Club Points</span>
            <Toggle checked={config.points_enabled==="true"} onChange={v=>set("points_enabled",String(v))}/>
          </div>
          {[
            {key:"points_per_purchase",label:"Points per Purchase (₹100)"},
            {key:"points_value",label:"1 Point Value (in currency)"},
            {key:"min_redeem_points",label:"Minimum Redeem Points"},
            {key:"max_redeem_per_order",label:"Max Redeem per Order"},
            {key:"expiry_days",label:"Points Expiry (days)"},
          ].map(({key,label})=>(
            <div key={key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
              <input value={config[key]||""} onChange={e=>set(key,e.target.value)} type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
              <Save className="size-4"/>{saving?"Saving…":"Update"}
            </button>
          </div>
        </div>
        {/* Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-800">Recent Point Transactions</h2></div>
          <div className="overflow-y-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 font-medium border-b border-gray-100">
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-right">Points</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-right">Date</th>
              </tr></thead>
              <tbody>
                {transactions.length===0?<tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No transactions</td></tr>
                :transactions.map((t:any)=>(
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2 text-gray-800 text-xs">{t.profiles?.full_name||"Unknown"}</td>
                    <td className="px-4 py-2 text-right font-semibold text-xs ${t.type==='earn'?'text-emerald-600':'text-red-500'}">{t.type==="earn"?"+":"-"}{Math.abs(t.points)}</td>
                    <td className="px-4 py-2 text-xs capitalize text-gray-500">{t.type}</td>
                    <td className="px-4 py-2 text-right text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
