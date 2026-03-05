"use client";
import React, { useEffect, useState } from "react";
import { Plus, X, RefreshCcw, Save } from "lucide-react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-gray-300"}`}>
      <span className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}/>
    </button>
  );
}

export default function HeaderSettingsPage() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [navMenu, setNavMenu] = useState<{label:string;href:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);

  const notify = (msg:string,ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    fetch("/api/admin/website-setup").then(r=>r.json()).then(j=>{
      setSettings(j.data||{});
      try { setNavMenu(JSON.parse(j.data?.header_nav||"[]")); } catch { setNavMenu([]); }
    }).finally(()=>setLoading(false));
  }, []);

  const set = (k:string, v:string) => setSettings(s=>({...s,[k]:v}));
  const setToggle = (k:string, v:boolean) => set(k, String(v));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...settings, header_nav: JSON.stringify(navMenu) };
      const res = await fetch("/api/admin/website-setup", {
        method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed");
      notify("Header settings updated");
    } catch { notify("Error saving",false); }
    finally { setSaving(false); }
  };

  const addNavItem = () => setNavMenu(m=>[...m,{label:"",href:"/"}]);
  const removeNavItem = (i:number) => setNavMenu(m=>m.filter((_,idx)=>idx!==i));
  const updateNavItem = (i:number, field:"label"|"href", val:string) =>
    setNavMenu(m=>m.map((item,idx)=>idx===i?{...item,[field]:val}:item));

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>{toast.msg}</div>}

      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Logo */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Site Logo</h3>
          <div className="flex items-center gap-4">
            {settings.site_logo ? (
              <img src={settings.site_logo} alt="Logo" className="h-14 object-contain border border-gray-100 rounded p-1" />
            ) : null}
            <input value={settings.site_logo||""} onChange={e=>set("site_logo",e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              placeholder="Logo URL or path" />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          {[
            { key:"show_language_switcher", label:"Show Language Switcher?" },
            { key:"show_currency_switcher", label:"Show Currency Switcher?" },
            { key:"sticky_header", label:"Enable sticky header?" },
          ].map(({key,label})=>(
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-700">{label}</span>
              <Toggle checked={settings[key]==="true"} onChange={v=>setToggle(key,v)} />
            </div>
          ))}
        </div>

        {/* Topbar Banner */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Topbar Banner</label>
            <div className="flex gap-2">
              <label className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">Browse</label>
              <input value={settings.topbar_banner||""} onChange={e=>set("topbar_banner",e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder="Choose File" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Topbar Banner Link</label>
            <input value={settings.topbar_banner_link||"/"} onChange={e=>set("topbar_banner_link",e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
        </div>

        {/* Help Line */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Help line number</label>
          <input value={settings.help_line||""} onChange={e=>set("help_line",e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            placeholder="Help line number" />
        </div>

        {/* Nav Menu */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Header Nav Menu</h3>
          <div className="space-y-2">
            {navMenu.map((item,i)=>(
              <div key={i} className="flex items-center gap-2">
                <input value={item.label} onChange={e=>updateNavItem(i,"label",e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="Label (e.g. Home)" />
                <input value={item.href} onChange={e=>updateNavItem(i,"href",e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="URL (e.g. /)" />
                <button onClick={()=>removeNavItem(i)} className="p-2 text-red-400 hover:text-red-600"><X className="size-4"/></button>
              </div>
            ))}
          </div>
          <button onClick={addNavItem} className="mt-2 flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
            <Plus className="size-3.5"/> Add New
          </button>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            <Save className="size-4"/> {saving?"Saving…":"Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
