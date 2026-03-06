"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Filter, RefreshCcw } from "lucide-react";

export default function Inhouse_Product_sale_reportPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (categoryId) params.set("category_id", categoryId);
      const res = await fetch(`/api/admin/reports/inhouse-sale?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setTotal(json.total || 0);
    } finally { setLoading(false); }
  }, [page, search, categoryId]);

  useEffect(() => {
    fetch("/api/admin/categories").then(r=>r.json()).then(j=>setCategories(j.items||[]));
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-5 px-6 py-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by Category :</span>
          <select value={categoryId} onChange={e=>{setCategoryId(e.target.value);setPage(1);}}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 min-w-[180px]">
            <option value="">All Categories</option>
            {categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={()=>{setPage(1);fetchData();}} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium">
            <Filter className="size-3.5"/> Filter
          </button>
        </div>
        <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 ml-auto">
          <RefreshCcw className="size-4" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Inhouse Product sale report</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
                <th className="px-4 py-3 text-left w-12">#</th>
                <th className="px-4 py-3 text-left">Product Name</th><th className="px-4 py-3 text-right">Num of Sale</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={99} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              : data.length===0 ? <tr><td colSpan={99} className="px-4 py-16 text-center"><div className="text-4xl mb-2">☹</div><div className="text-gray-400">Nothing found</div></td></tr>
              : data.map((row:any,i:number)=><tr key={row.id||i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{(page-1)*perPage+i+1}</td>
                  <td className="px-4 py-3 text-gray-800">{row.name}</td><td className="px-4 py-3 text-right font-semibold text-gray-700">{row.num_of_sale}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
        {totalPages>1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-1">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">‹</button>
            {Array.from({length:Math.min(totalPages,10)},(_,i)=>i+1).map(p=>(
              <button key={p} onClick={()=>setPage(p)} className={`px-2.5 py-1 text-xs rounded ${p===page?"bg-orange-500 text-white":"border border-gray-200 hover:bg-gray-50"}`}>{p}</button>
            ))}
            {totalPages>10 && <span className="text-xs text-gray-400 px-1">… {totalPages}</span>}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-2 py-1 text-xs border border-gray-200 rounded disabled:opacity-40">›</button>
          </div>
        )}
      </div>
    </div>
  );
}
