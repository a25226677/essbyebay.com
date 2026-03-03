"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Wallet, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
type Withdrawal = { id: string; amount: number; method: string; status: string; created_at: string; profiles: { full_name: string } | null; shops: { name: string } | null; };
type Pagination = { page: number; limit: number; total: number; pages: number };
const SC: Record<string,{bg:string;text:string}> = { pending:{bg:"#fef3c7",text:"#d97706"}, approved:{bg:"#d1fae5",text:"#059669"}, rejected:{bg:"#fee2e2",text:"#dc2626"} };
const STATUSES = ["","pending","approved","rejected"];
export default function OfflinePaymentPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({page:1,limit:20,total:0,pages:1});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const loadItems = useCallback(async (ov?:{status?:string;page?:number}) => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(ov?.page ?? page), limit: "20" });
    const st = ov?.status ?? status; if (st) p.set("status", st);
    try {
      const r = await fetch("/api/admin/withdrawals?" + p);
      const j = await r.json();
      setItems(j.items || []);
      setPagination(j.pagination || {page:1,limit:20,total:0,pages:1});
    } catch {} finally { setLoading(false); }
  }, [status, page]);
  useEffect(() => { loadItems(); }, [loadItems]);
  const updateStatus = async (id: string, st: string) => {
    await fetch("/api/admin/withdrawals", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({id, status:st}) });
    loadItems();
  };
  const hst = (v: string) => { setStatus(v); setPage(1); loadItems({status:v,page:1}); };
  const hp = (pg: number) => { setPage(pg); loadItems({page:pg}); };
  const total = items.reduce((s, i) => s + Number(i.amount), 0);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Withdrawal Requests</h1><p className="text-xs text-gray-500 mt-0.5">{pagination.total.toLocaleString()} requests · {total.toFixed(2)} shown</p></div>
        <button onClick={() => loadItems()} className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> Refresh</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-1.5">{STATUSES.map(s => <button key={s||"all"} onClick={() => hst(s)} className={"text-xs font-medium px-3 py-1.5 rounded-lg transition-all " + (status===s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{s ? s.charAt(0).toUpperCase()+s.slice(1) : "All"}</button>)}</div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><RefreshCw className="size-5 animate-spin text-indigo-400" /><span className="ml-3 text-sm text-gray-500">Loading…</span></div>
        : items.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3"><Wallet className="size-10 opacity-30" /><p className="text-sm">No withdrawal requests</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-gray-50 bg-gray-50/50">{["Seller","Shop","Amount","Method","Status","Date","Actions"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">{items.map((it) => {
            const c = SC[it.status] || {bg:"#f3f4f6",text:"#6b7280"};
            return (
              <tr key={it.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3.5 text-xs font-medium text-gray-800">{it.profiles?.full_name || "—"}</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">{it.shops?.name || "—"}</td>
                <td className="px-5 py-3.5"><span className="text-xs font-bold text-gray-900">{Number(it.amount).toFixed(2)}</span></td>
                <td className="px-5 py-3.5 text-xs text-gray-500 capitalize">{it.method || "—"}</td>
                <td className="px-5 py-3.5"><span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{background:c.bg,color:c.text}}>{it.status.charAt(0).toUpperCase()+it.status.slice(1)}</span></td>
                <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(it.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3.5">{it.status==="pending" && <div className="flex items-center gap-1.5"><button onClick={()=>updateStatus(it.id,"approved")} className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500"><CheckCircle className="size-4"/></button><button onClick={()=>updateStatus(it.id,"rejected")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><XCircle className="size-4"/></button></div>}</td>
              </tr>
            );
          })}</tbody>
        </table></div>}
        {pagination.pages>1 && <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50"><span className="text-xs text-gray-500">Showing {(page-1)*pagination.limit+1}–{Math.min(page*pagination.limit,pagination.total)} of {pagination.total}</span><div className="flex items-center gap-1"><button onClick={()=>hp(page-1)} disabled={page<=1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="size-4 text-gray-600"/></button>{Array.from({length:Math.min(5,pagination.pages)},(_,i)=>{const pg=Math.max(1,Math.min(page-2,pagination.pages-4))+i;return <button key={pg} onClick={()=>hp(pg)} className={"w-7 h-7 text-xs rounded-lg font-medium "+(pg===page?"bg-indigo-600 text-white":"hover:bg-gray-100 text-gray-600")}>{pg}</button>;})}<button onClick={()=>hp(page+1)} disabled={page>=pagination.pages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="size-4 text-gray-600"/></button></div></div>}
      </div>
    </div>
  );
}
