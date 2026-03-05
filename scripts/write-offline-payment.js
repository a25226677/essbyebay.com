const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "..");

function write(relPath, content) {
  const full = path.join(base, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("Written:", relPath);
}

// ─── API: Manual Payment Methods ────────────────────────────────────────────
write("app/api/admin/offline-payment/manual-methods/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";

export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { data, error } = await db
      .from("payment_methods")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const body = await req.json();
    const { heading, logo_url } = body;
    if (!heading) return NextResponse.json({ error: "Heading required" }, { status: 400 });
    const { data, error } = await db
      .from("payment_methods")
      .insert({ heading, logo_url: logo_url || null })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const body = await req.json();
    const { id, heading, logo_url, is_active } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const updates: any = { updated_at: new Date().toISOString() };
    if (heading !== undefined) updates.heading = heading;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await db
      .from("payment_methods")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    const { error } = await db.from("payment_methods").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
`);

// ─── API: Offline Wallet Recharge ─────────────────────────────────────────
write("app/api/admin/offline-payment/wallet-recharge/route.ts", `import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/supabase/admin-api";

export async function GET(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const operator = searchParams.get("operator") || "";
    const date = searchParams.get("date") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = 10;
    const from = (page - 1) * perPage;

    let query = db
      .from("offline_recharges")
      .select("*, user:profiles!offline_recharges_user_id_fkey(full_name,avatar_url,phone), operator:profiles!offline_recharges_operator_id_fkey(full_name)", { count: "exact" });

    if (search) query = query.ilike("profiles.full_name", \`%\${search}%\`);
    if (date) {
      const start = new Date(date); start.setHours(0,0,0,0);
      const end = new Date(date); end.setHours(23,59,59,999);
      query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
    }
    query = query.order("created_at", { ascending: false }).range(from, from + perPage - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data || [], total: count || 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { db } = await getAdminContext();
    const body = await req.json();
    const { id, is_approved } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // If approving, credit user wallet
    if (is_approved === true) {
      const { data: record } = await db.from("offline_recharges").select("*").eq("id", id).single();
      if (record && record.user_id && record.amount) {
        // Get current wallet balance
        const { data: profile } = await db.from("profiles").select("wallet_balance").eq("id", record.user_id).single();
        const currentBalance = profile?.wallet_balance || 0;
        await db.from("profiles").update({ wallet_balance: currentBalance + record.amount }).eq("id", record.user_id);
        // Record transaction
        await db.from("wallet_transactions").insert({
          user_id: record.user_id,
          amount: record.amount,
          type: "credit",
          description: \`Offline recharge approved (TXN: \${record.txn_id || "N/A"})\`,
          reference_id: id,
        });
      }
    }

    const { data, error } = await db
      .from("offline_recharges")
      .update({ is_approved, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
`);

// ─── PAGE: Manual Payment Methods ─────────────────────────────────────────
write("app/admin/(dashboard)/offline-payment/manual-methods/page.tsx", `"use client";

import React, { useEffect, useState, useRef } from "react";
import { Pencil, Trash2, Plus, ImageIcon, X } from "lucide-react";

interface PaymentMethod { id: string; heading: string; logo_url: string | null; is_active: boolean; }

export default function ManualPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ heading: "", logo_url: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, ok = true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/offline-payment/manual-methods");
      const json = await res.json();
      setMethods(json.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMethods(); }, []);

  const openAdd = () => { setEditing(null); setForm({heading:"",logo_url:""}); setShowModal(true); };
  const openEdit = (m: PaymentMethod) => { setEditing(m); setForm({heading:m.heading,logo_url:m.logo_url||""}); setShowModal(true); };

  const handleSave = async () => {
    if (!form.heading.trim()) return notify("Heading required", false);
    setSaving(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch("/api/admin/offline-payment/manual-methods", {
        method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      notify(editing ? "Updated" : "Added");
      setShowModal(false);
      fetchMethods();
    } catch { notify("Error saving", false); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    try {
      await fetch(\`/api/admin/offline-payment/manual-methods?id=\${id}\`, { method: "DELETE" });
      notify("Deleted");
      fetchMethods();
    } catch { notify("Error", false); }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && (
        <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{background:"#06b6d4"}}>
          <Plus className="size-4" /> Add New Payment Method
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Manual Payment Method</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium w-12">#</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Heading</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Logo</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 text-sm">Loading…</td></tr>
              ) : methods.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No payment methods</td></tr>
              ) : methods.map((m, i) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-500 text-xs">{i+1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{m.heading}</td>
                  <td className="px-4 py-3">
                    {m.logo_url ? (
                      <img src={m.logo_url} alt={m.heading} className="h-10 w-16 object-contain rounded border border-gray-100" />
                    ) : (
                      <div className="h-10 w-16 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                        <ImageIcon className="size-4 text-gray-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={()=>openEdit(m)} className="p-1.5 rounded-md border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={()=>handleDelete(m.id)} className="p-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editing?"Edit Payment Method":"Add New Payment Method"}</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Heading *</label>
                <input value={form.heading} onChange={e=>setForm(f=>({...f,heading:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="e.g. Bank, USDT-TRC20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Logo URL</label>
                <input value={form.logo_url} onChange={e=>setForm(f=>({...f,logo_url:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="https://..." />
                {form.logo_url && (
                  <img src={form.logo_url} alt="Preview" className="mt-2 h-12 w-24 object-contain rounded border border-gray-100" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60">
                {saving?"Saving…":"Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`);

// ─── PAGE: Offline Wallet Recharge ─────────────────────────────────────────
write("app/admin/(dashboard)/offline-payment/wallet-recharge/page.tsx", `"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Eye, RefreshCcw, Search } from "lucide-react";

interface Recharge {
  id: string; amount: number; method: string; txn_id: string | null; photo_url: string | null;
  is_approved: boolean; type: string; created_at: string; notes: string | null;
  user: { full_name: string; avatar_url: string | null; } | null;
  operator: { full_name: string; } | null;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)}
      className={\`relative inline-flex h-5 w-9 items-center rounded-full transition-colors \${checked ? "bg-emerald-500" : "bg-gray-300"}\`}>
      <span className={\`inline-block size-4 transform rounded-full bg-white shadow transition-transform \${checked ? "translate-x-4" : "translate-x-0.5"}\`}/>
    </button>
  );
}

export default function OfflineWalletRechargePage() {
  const [data, setData] = useState<Recharge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [viewItem, setViewItem] = useState<Recharge|null>(null);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const perPage = 10;

  const notify = (msg: string, ok = true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (dateFilter) params.set("date", dateFilter);
      const res = await fetch(\`/api/admin/offline-payment/wallet-recharge?\${params}\`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } finally { setLoading(false); }
  }, [page, search, dateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async (item: Recharge, val: boolean) => {
    setData(prev => prev.map(r => r.id === item.id ? {...r, is_approved: val} : r));
    try {
      const res = await fetch("/api/admin/offline-payment/wallet-recharge", {
        method: "PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ id: item.id, is_approved: val }),
      });
      if (!res.ok) throw new Error("Failed");
      notify(val ? "Approved – wallet credited" : "Disapproved");
    } catch { setData(prev => prev.map(r => r.id === item.id ? {...r, is_approved: item.is_approved} : r)); notify("Error", false); }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && (
        <div className={\`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg \${toast.ok?"bg-green-500":"bg-red-500"}\`}>
          {toast.msg}
        </div>
      )}

      {/* Title + Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-base font-semibold text-gray-800">Offline Wallet Recharge Requests</h1>
        </div>
        <div className="px-6 py-4 flex flex-wrap items-center gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchData()}
            placeholder="Name" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:border-orange-400" />
          <input type="text" placeholder="Operator" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:border-orange-400" />
          <input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          <button onClick={()=>{setPage(1);fetchData();}}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
            <Search className="size-3.5" /> Search
          </button>
          <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
            <RefreshCcw className="size-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
                <th className="px-3 py-3 text-left w-10">#</th>
                <th className="px-3 py-3 text-left">Name</th>
                <th className="px-3 py-3 text-left">Amount</th>
                <th className="px-3 py-3 text-left">Method</th>
                <th className="px-3 py-3 text-left">TXN ID</th>
                <th className="px-3 py-3 text-left">Photo</th>
                <th className="px-3 py-3 text-left">Approval</th>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No records found</td></tr>
              ) : data.map((item, i) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-gray-500 text-xs">{(page-1)*perPage+i+1}</td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-gray-800">
                      {item.user?.full_name || "Unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-800">{item.amount}</td>
                  <td className="px-3 py-3 text-gray-600">{item.method}</td>
                  <td className="px-3 py-3 text-gray-500 font-mono text-xs">{item.txn_id || "—"}</td>
                  <td className="px-3 py-3">
                    {item.photo_url ? (
                      <a href={item.photo_url} target="_blank" rel="noopener" className="text-orange-500 text-xs font-medium hover:underline">Open Reciept</a>
                    ) : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <Toggle checked={item.is_approved} onChange={val=>handleToggle(item,val)} />
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{item.type}</td>
                  <td className="px-3 py-3 text-gray-500 text-xs">
                    {new Date(item.created_at).toLocaleString("en-GB",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">‹</button>
            {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={\`px-2.5 py-1 text-xs rounded \${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}\`}>{p}</button>
            ))}
            {totalPages > 10 && <span className="text-xs text-gray-400">… {totalPages}</span>}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">›</button>
          </div>
        )}
      </div>
    </div>
  );
}
`);

// ─── Create redirect for /offline-payment/page.tsx ─────────────────────────
write("app/admin/(dashboard)/offline-payment/page.tsx", `import { redirect } from "next/navigation";
export default function OfflinePaymentPage() {
  redirect("/admin/offline-payment/manual-methods");
}
`);

console.log("\\n✅ Offline Payment done");
