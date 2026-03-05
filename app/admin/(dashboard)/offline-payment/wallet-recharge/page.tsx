"use client";

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
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-gray-300"}`}>
      <span className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}/>
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
      const res = await fetch(`/api/admin/offline-payment/wallet-recharge?${params}`);
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
        <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>
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
              <button key={p} onClick={()=>setPage(p)} className={`px-2.5 py-1 text-xs rounded ${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}`}>{p}</button>
            ))}
            {totalPages > 10 && <span className="text-xs text-gray-400">… {totalPages}</span>}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">›</button>
          </div>
        )}
      </div>
    </div>
  );
}
