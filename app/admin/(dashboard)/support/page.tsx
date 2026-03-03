"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, RefreshCw, Headphones, ChevronLeft, ChevronRight } from "lucide-react";
type Ticket = { id: string; subject: string; status: string; created_at: string; profiles: { full_name: string } | null; orders: { id: string } | null; };
type Pagination = { page: number; limit: number; total: number; pages: number };
const SC: Record<string,{bg:string;text:string}> = { open:{bg:"#dbeafe",text:"#2563eb"}, in_progress:{bg:"#ede9fe",text:"#7c3aed"}, resolved:{bg:"#d1fae5",text:"#059669"}, closed:{bg:"#f3f4f6",text:"#6b7280"} };
const STATUSES = ["","open","in_progress","resolved","closed"];
export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination>({page:1,limit:20,total:0,pages:1});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(1);
  const t = useRef<ReturnType<typeof setTimeout>|null>(null);
  const loadTickets = useCallback(async (ov?:{search?:string;status?:string;page?:number}) => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(ov?.page ?? page), limit: "20" });
    const s = ov?.search ?? search; const st = ov?.status ?? status;
    if (s) p.set("search", s); if (st) p.set("status", st);
    try {
      const r = await fetch("/api/admin/support-tickets?" + p);
      const j = await r.json();
      setTickets(j.items || []);
      setPagination(j.pagination || {page:1,limit:20,total:0,pages:1});
    } catch {} finally { setLoading(false); }
  }, [search, status, page]);
  useEffect(() => { loadTickets(); }, [loadTickets]);
  const updateStatus = async (id: string, st: string) => {
    await fetch("/api/admin/support-tickets", { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({id, status: st}) });
    loadTickets();
  };
  const hs = (v: string) => { setSearch(v); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => { setPage(1); loadTickets({search:v,page:1}); }, 400); };
  const hst = (v: string) => { setStatus(v); setPage(1); loadTickets({status:v,page:1}); };
  const hp = (pg: number) => { setPage(pg); loadTickets({page:pg}); };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Support Tickets</h1><p className="text-xs text-gray-500 mt-0.5">{pagination.total.toLocaleString()} tickets</p></div>
        <button onClick={() => loadTickets()} className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> Refresh</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 max-w-sm focus-within:border-indigo-400">
          <Search className="size-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search tickets…" value={search} onChange={(e) => hs(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full" />
        </div>
        <div className="flex gap-1.5 mt-3">{STATUSES.map(s => <button key={s||"all"} onClick={() => hst(s)} className={"text-xs font-medium px-3 py-1.5 rounded-lg transition-all " + (status === s ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{s ? s.replace("_"," ").replace(/\w/g,(c: string) => c.toUpperCase()) : "All"}</button>)}</div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><RefreshCw className="size-5 animate-spin text-indigo-400" /><span className="ml-3 text-sm text-gray-500">Loading…</span></div>
        : tickets.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3"><Headphones className="size-10 opacity-30" /><p className="text-sm">No tickets found</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-gray-50 bg-gray-50/50">{["Ticket","Customer","Order","Status","Date","Update"].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">{tickets.map((tk) => {
            const c = SC[tk.status] || {bg:"#f3f4f6",text:"#6b7280"};
            return (
              <tr key={tk.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3.5"><p className="text-xs font-medium text-gray-800 max-w-[200px] truncate">{tk.subject}</p><p className="text-[11px] text-gray-400 font-mono mt-0.5">{tk.id.slice(0,8)}</p></td>
                <td className="px-5 py-3.5 text-xs text-gray-600">{tk.profiles?.full_name || "—"}</td>
                <td className="px-5 py-3.5 text-xs font-mono text-gray-400">{tk.orders ? "#" + tk.orders.id.slice(0,8).toUpperCase() : "—"}</td>
                <td className="px-5 py-3.5"><span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{background:c.bg,color:c.text}}>{tk.status.replace("_"," ").replace(/\w/g,(ch:string)=>ch.toUpperCase())}</span></td>
                <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(tk.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-3.5"><select value={tk.status} onChange={(e) => updateStatus(tk.id, e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-indigo-400 cursor-pointer">{["open","in_progress","resolved","closed"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}</select></td>
              </tr>
            );
          })}</tbody>
        </table></div>}
        {pagination.pages>1 && <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50"><span className="text-xs text-gray-500">Showing {(page-1)*pagination.limit+1}–{Math.min(page*pagination.limit,pagination.total)} of {pagination.total}</span><div className="flex items-center gap-1"><button onClick={()=>hp(page-1)} disabled={page<=1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="size-4 text-gray-600"/></button>{Array.from({length:Math.min(5,pagination.pages)},(_,i)=>{const pg=Math.max(1,Math.min(page-2,pagination.pages-4))+i;return <button key={pg} onClick={()=>hp(pg)} className={"w-7 h-7 text-xs rounded-lg font-medium "+(pg===page?"bg-indigo-600 text-white":"hover:bg-gray-100 text-gray-600")}>{pg}</button>;})}<button onClick={()=>hp(page+1)} disabled={page>=pagination.pages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="size-4 text-gray-600"/></button></div></div>}
      </div>
    </div>
  );
}
