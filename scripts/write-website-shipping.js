const fs = require("fs");
const path = require("path");
const base = path.join(__dirname, "..");
function write(relPath, content) {
  const full = path.join(base, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("Written:", relPath);
}

// ── API: Website Settings ─────────────────────────────────────────────────
write("app/api/admin/website-setup/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET() {
  try {
    const { db } = await getAdminContext();
    const { data, error } = await db.from("website_settings").select("*");
    if (error) throw error;
    const settings: Record<string, string> = {};
    (data||[]).forEach((r:any) => { settings[r.setting_key] = r.setting_value; });
    return NextResponse.json({ data: settings });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const body = await req.json();
    const entries = Object.entries(body as Record<string,string>);
    for (const [key, value] of entries) {
      await db.from("website_settings").upsert({ setting_key: key, setting_value: String(value), updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
    }
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
`);

// ── API: Shipping ─────────────────────────────────────────────────────────
write("app/api/admin/shipping/config/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET() {
  try {
    const { db } = await getAdminContext();
    const { data, error } = await db.from("shipping_config").select("*");
    if (error) throw error;
    const config: Record<string, string> = {};
    (data||[]).forEach((r:any) => { config[r.config_key] = r.config_value; });
    return NextResponse.json({ data: config });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const body = await req.json();
    for (const [key, value] of Object.entries(body as Record<string,string>)) {
      await db.from("shipping_config").upsert({ config_key: key, config_value: String(value), updated_at: new Date().toISOString() }, { onConflict: "config_key" });
    }
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
`);

write("app/api/admin/shipping/countries/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 15; const from = (page-1)*perPage;
    const { data, error, count } = await db.from("shipping_countries")
      .select("*",{count:"exact"}).order("name").range(from, from+perPage-1);
    if (error) throw error;
    return NextResponse.json({ data: data||[], total: count||0 });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { name, code } = await req.json();
    const { data, error } = await db.from("shipping_countries").insert({ name, code }).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function PATCH(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { id, is_active, name, code } = await req.json();
    const updates: any = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (name !== undefined) updates.name = name;
    if (code !== undefined) updates.code = code;
    const { data, error } = await db.from("shipping_countries").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const { error } = await db.from("shipping_countries").delete().eq("id", id!);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
`);

write("app/api/admin/shipping/states/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const countryId = searchParams.get("country_id")||"";
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("shipping_states").select("*, shipping_countries!shipping_states_country_id_fkey(name,code)",{count:"exact"});
    if (countryId) query = query.eq("country_id", countryId);
    query = query.order("name").range(from, from+perPage-1);
    const { data, error, count } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data||[], total: count||0 });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function POST(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { country_id, name, state_code } = await req.json();
    const { data, error } = await db.from("shipping_states").insert({ country_id, name, state_code }).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function PATCH(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { id, name, state_code, is_active } = await req.json();
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (state_code !== undefined) updates.state_code = state_code;
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await db.from("shipping_states").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const { error } = await db.from("shipping_states").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
`);

write("app/api/admin/shipping/cities/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const stateId = searchParams.get("state_id")||"";
    const page = parseInt(searchParams.get("page")||"1");
    const perPage = 20; const from = (page-1)*perPage;
    let query = db.from("shipping_cities").select("*, shipping_states!shipping_cities_state_id_fkey(name)",{count:"exact"});
    if (stateId) query = query.eq("state_id", stateId);
    query = query.order("name").range(from,from+perPage-1);
    const {data,error,count} = await query;
    if (error) throw error;
    return NextResponse.json({data:data||[],total:count||0});
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function POST(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { state_id, name, shipping_cost } = await req.json();
    const { data, error } = await db.from("shipping_cities").insert({ state_id, name, shipping_cost: shipping_cost||0 }).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function PATCH(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { id, name, shipping_cost, is_active } = await req.json();
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (shipping_cost !== undefined) updates.shipping_cost = shipping_cost;
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await db.from("shipping_cities").update(updates).eq("id",id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
export async function DELETE(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const { error } = await db.from("shipping_cities").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({error:e.message},{status:500}); }
}
`);

// ── PAGE: Website Setup → Header ─────────────────────────────────────────
write("app/admin/(dashboard)/website-setup/header/page.tsx", `"use client";
import React, { useEffect, useState } from "react";
import { Plus, X, RefreshCcw, Save } from "lucide-react";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${checked ? "bg-emerald-500" : "bg-gray-300"}\`}>
      <span className={\`inline-block size-5 transform rounded-full bg-white shadow transition-transform \${checked ? "translate-x-5" : "translate-x-0.5"}\`}/>
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
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}

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
`);

// ── PAGE: Website Setup → Footer ─────────────────────────────────────────
write("app/admin/(dashboard)/website-setup/footer/page.tsx", `"use client";
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
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
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
              <input value={settings[\`social_\${s}\`]||""} onChange={e=>set(\`social_\${s}\`,e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                placeholder={\`https://\${s}.com/...\`} />
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
`);

// ── PAGE: Website Setup → Appearance ─────────────────────────────────────
write("app/admin/(dashboard)/website-setup/appearance/page.tsx", `"use client";
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
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
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
`);

// ── PAGE: Website Setup → General Settings ────────────────────────────────
write("app/admin/(dashboard)/website-setup/general-settings/page.tsx", `"use client";
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
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
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
`);

// ── PAGE: Website Setup → Features Activation ─────────────────────────────
write("app/admin/(dashboard)/website-setup/features/page.tsx", `"use client";
import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${checked?"bg-emerald-500":"bg-gray-300"}\`}>
      <span className={\`inline-block size-5 transform rounded-full bg-white shadow transition-transform \${checked?"translate-x-5":"translate-x-0.5"}\`}/>
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
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
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
`);

// ── PAGE: Website Setup → Pages ───────────────────────────────────────────
write("app/admin/(dashboard)/website-setup/pages/page.tsx", `"use client";
import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Save } from "lucide-react";
interface Page { id: string; title: string; slug: string; content: string; is_published: boolean; created_at: string; }
export default function PagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Page|null>(null);
  const [form, setForm] = useState({title:"",slug:"",content:"",is_published:true});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(msg:string,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};
  const fetch_ = async ()=>{
    setLoading(true);
    try { const r=await fetch("/api/admin/website-setup/pages"); const j=await r.json(); setPages(j.data||[]); } finally{setLoading(false);}
  };
  useEffect(()=>{fetch_();},[]);
  const openAdd=()=>{ setEditing(null);setForm({title:"",slug:"",content:"",is_published:true});setShowModal(true); };
  const openEdit=(p:Page)=>{ setEditing(p);setForm({title:p.title,slug:p.slug,content:p.content,is_published:p.is_published});setShowModal(true); };
  const handleSave=async()=>{
    if(!form.title) return notify("Title required",false);
    setSaving(true);
    try {
      const method=editing?"PATCH":"POST";
      const body=editing?{id:editing.id,...form}:form;
      const res=await fetch("/api/admin/website-setup/pages",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!res.ok) throw new Error();
      notify(editing?"Updated":"Created");
      setShowModal(false); fetch_();
    } catch{notify("Error",false);}finally{setSaving(false);}
  };
  const handleDelete=async(id:string)=>{
    if(!confirm("Delete page?"))return;
    await fetch(\`/api/admin/website-setup/pages?id=\${id}\`,{method:"DELETE"});
    notify("Deleted"); fetch_();
  };
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
      <div className="flex justify-end mb-5">
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
          <Plus className="size-4"/> Add New Page
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100"><h2 className="text-base font-semibold text-gray-800">Pages</h2></div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">Title</th>
            <th className="px-4 py-3 text-left">Slug</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Options</th>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
            :pages.length===0?<tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No pages yet</td></tr>
            :pages.map((p,i)=>(
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{i+1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{p.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">/{p.slug}</td>
                <td className="px-4 py-3"><span className={\`px-2 py-0.5 rounded text-[10px] font-medium \${p.is_published?"bg-emerald-50 text-emerald-600":"bg-gray-100 text-gray-500"}\`}>{p.is_published?"Published":"Draft"}</span></td>
                <td className="px-4 py-3"><div className="flex items-center justify-end gap-2">
                  <button onClick={()=>openEdit(p)} className="p-1.5 rounded-md border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600"><Pencil className="size-3.5"/></button>
                  <button onClick={()=>handleDelete(p.id)} className="p-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600"><Trash2 className="size-3.5"/></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editing?"Edit Page":"New Page"}</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Page Title"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
              <input value={form.slug} onChange={e=>setForm(f=>({...f,slug:e.target.value}))} placeholder="slug-url"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"/>
              <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={8} placeholder="Page content (HTML supported)…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none font-mono"/>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.is_published} onChange={e=>setForm(f=>({...f,is_published:e.target.checked}))} className="accent-orange-500"/>
                Published
              </label>
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
`);

// ── PAGE: Website Setup index redirect ───────────────────────────────────
write("app/admin/(dashboard)/website-setup/page.tsx", `import { redirect } from "next/navigation";
export default function WebsiteSetupPage() { redirect("/admin/website-setup/header"); }
`);

// ── PAGE: Shipping → Config ────────────────────────────────────────────────
write("app/admin/(dashboard)/shipping/page.tsx", `"use client";
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
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
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
`);

// ── PAGE: Shipping Countries ───────────────────────────────────────────────
write("app/admin/(dashboard)/shipping/countries/page.tsx", `"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
interface Country { id: string; name: string; code: string; is_active: boolean; }
function Toggle({checked,onChange}:{checked:boolean;onChange:(v:boolean)=>void}){
  return(<button onClick={()=>onChange(!checked)} className={\`relative inline-flex h-5 w-9 items-center rounded-full transition-colors \${checked?"bg-emerald-500":"bg-gray-300"}\`}><span className={\`inline-block size-4 transform rounded-full bg-white shadow transition-transform \${checked?"translate-x-4":"translate-x-0.5"}\`}/></button>);
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
      const res=await fetch(\`/api/admin/shipping/countries?page=\${page}\`);
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
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
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
              <button key={p} onClick={()=>setPage(p)} className={\`px-2.5 py-1 text-xs rounded \${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}\`}>{p}</button>
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
`);

// ── PAGE: Shipping States ─────────────────────────────────────────────────
write("app/admin/(dashboard)/shipping/states/page.tsx", `"use client";
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
      const r=await fetch(\`/api/admin/shipping/states?\${params}\`);
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
    await fetch(\`/api/admin/shipping/states?id=\${id}\`,{method:"DELETE"});
    notify("Deleted");fetchData();
  };
  const totalPages=Math.ceil(total/perPage);
  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
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
              <button key={p} onClick={()=>setPage(p)} className={\`px-2.5 py-1 text-xs rounded \${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}\`}>{p}</button>
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
`);

// ── PAGE: Shipping Cities ─────────────────────────────────────────────────
write("app/admin/(dashboard)/shipping/cities/page.tsx", `"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, X } from "lucide-react";
interface City { id:string; name:string; shipping_cost:number; is_active:boolean; shipping_states?:{name:string}; }
interface State { id:string; name:string; }
export default function ShippingCitiesPage() {
  const [data, setData] = useState<City[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<State[]>([]);
  const [filterState, setFilterState] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({state_id:"",name:"",shipping_cost:"0"});
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const notify=(m:string,ok=true)=>{setToast({msg:m,ok});setTimeout(()=>setToast(null),3000);};
  const perPage=20;
  const fetchData=useCallback(async()=>{
    setLoading(true);
    try{
      const params=new URLSearchParams({page:String(page)});
      if(filterState) params.set("state_id",filterState);
      const r=await fetch(\`/api/admin/shipping/cities?\${params}\`);
      const j=await r.json();
      setData(j.data||[]);setTotal(j.total||0);
    }finally{setLoading(false);}
  },[page,filterState]);
  useEffect(()=>{
    fetch("/api/admin/shipping/states?page=1").then(r=>r.json()).then(j=>setStates((j.data||[]).slice(0,100)));
    fetchData();
  },[fetchData]);
  const handleAdd=async()=>{
    if(!form.state_id||!form.name) return notify("State and city name required",false);
    try{
      const res=await fetch("/api/admin/shipping/cities",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,shipping_cost:parseFloat(form.shipping_cost)||0})});
      if(!res.ok) throw new Error();
      notify("City added");setShowModal(false);setForm({state_id:"",name:"",shipping_cost:"0"});fetchData();
    }catch{notify("Error",false);}
  };
  const handleDelete=async(id:string)=>{
    if(!confirm("Delete?"))return;
    await fetch(\`/api/admin/shipping/cities?id=\${id}\`,{method:"DELETE"});
    notify("Deleted");fetchData();
  };
  const totalPages=Math.ceil(total/perPage);
  return(
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>{toast.msg}</div>}
      <div className="flex items-center justify-between mb-5">
        <select value={filterState} onChange={e=>{setFilterState(e.target.value);setPage(1);}}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 min-w-[200px]">
          <option value="">All States</option>
          {states.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
          <Plus className="size-4"/>Add City
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
            <th className="px-4 py-3 text-left w-12">#</th>
            <th className="px-4 py-3 text-left">City Name</th>
            <th className="px-4 py-3 text-left">State</th>
            <th className="px-4 py-3 text-right">Shipping Cost</th>
            <th className="px-4 py-3 text-right">Options</th>
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
            :data.length===0?<tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No cities found</td></tr>
            :data.map((c,i)=>(
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-500 text-xs">{(page-1)*perPage+i+1}</td>
                <td className="px-4 py-3 text-gray-800">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.shipping_states?.name||"—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">{c.shipping_cost}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={()=>handleDelete(c.id)} className="p-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600"><Trash2 className="size-3.5"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages>1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">‹</button>
            {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={\`px-2.5 py-1 text-xs rounded \${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}\`}>{p}</button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">›</button>
          </div>
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Add City</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5"/></button>
            </div>
            <div className="p-5 space-y-3">
              <select value={form.state_id} onChange={e=>setForm(f=>({...f,state_id:e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
                <option value="">Select State</option>
                {states.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="City Name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
              <input value={form.shipping_cost} onChange={e=>setForm(f=>({...f,shipping_cost:e.target.value}))} type="number" placeholder="Shipping Cost"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"/>
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
`);

// ─── Website Setup Pages API ──────────────────────────────────────────────
write("app/api/admin/website-setup/pages/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";
export async function GET() {
  try {
    const { db } = await getAdminContext();
    const { data, error } = await db.from("website_pages").select("*").order("created_at", {ascending:false});
    if (error) {
      // Table might not exist yet — return empty
      return NextResponse.json({ data: [] });
    }
    return NextResponse.json({ data: data||[] });
  } catch { return NextResponse.json({ data: [] }); }
}
export async function POST(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { title, slug, content, is_published } = await req.json();
    const { data, error } = await db.from("website_pages").insert({ title, slug, content, is_published }).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function PATCH(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { id, title, slug, content, is_published } = await req.json();
    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (slug !== undefined) updates.slug = slug;
    if (content !== undefined) updates.content = content;
    if (is_published !== undefined) updates.is_published = is_published;
    const { data, error } = await db.from("website_pages").update(updates).eq("id",id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
export async function DELETE(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const { error } = await db.from("website_pages").delete().eq("id", searchParams.get("id")!);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e:any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
`);

console.log("\\n✅ Website Setup + Shipping done");
