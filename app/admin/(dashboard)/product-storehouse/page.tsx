/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, RefreshCw, Package, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
type Product = { id: string; title: string; sku: string | null; price: number; stock_quantity: number; is_active: boolean; image_url: string | null; categories: { name: string } | null; shops: { name: string } | null; };
type Pagination = { page: number; limit: number; total: number; pages: number };
const STOCK_TABS = [{ value: "", label: "All" }, { value: "in_stock", label: "In Stock" }, { value: "low_stock", label: "Low Stock" }, { value: "out_of_stock", label: "Out of Stock" }];
function StockBadge({ qty }: { qty: number }) {
  if (qty === 0) return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Out of Stock</span>;
  if (qty <= 10) return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600"><AlertTriangle className="size-3 inline mr-1"/>{qty} left</span>;
  return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">{qty} units</span>;
}
export default function ProductStorehousePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(""); const [stock, setStock] = useState(""); const [page, setPage] = useState(1);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadProducts = useCallback(async (ov?: { search?: string; stock?: string; page?: number }) => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(ov?.page ?? page), limit: "20" });
    const s = ov?.search ?? search; const st = ov?.stock ?? stock;
    if (s) p.set("search", s); if (st) p.set("stock", st);
    try {
      const r = await fetch("/api/admin/products?" + p);
      const j = await r.json();
      setProducts(j.items || []);
      setPagination(j.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch {} finally { setLoading(false); }
  }, [search, stock, page]);
  useEffect(() => { loadProducts(); }, [loadProducts]);
  const toggleActive = async (id: string, active: boolean) => {
    await fetch(`/api/admin/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !active }) });
    loadProducts();
  };
  const hs = (v: string) => { setSearch(v); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => { setPage(1); loadProducts({ search: v, page: 1 }); }, 400); };
  const hst = (s: string) => { setStock(s); setPage(1); loadProducts({ stock: s, page: 1 }); };
  const hp = (pg: number) => { setPage(pg); loadProducts({ page: pg }); };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Product Storehouse</h1><p className="text-xs text-gray-500 mt-0.5">{pagination.total.toLocaleString()} products</p></div>
        <button onClick={() => loadProducts()} className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> Refresh</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 max-w-sm focus-within:border-indigo-400">
          <Search className="size-4 text-gray-400 shrink-0" />
          <input type="text" placeholder="Search products…" value={search} onChange={(e) => hs(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full" />
        </div>
        <div className="flex gap-1.5 mt-3">{STOCK_TABS.map((tab) => <button key={tab.value} onClick={() => hst(tab.value)} className={"shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all " + (stock === tab.value ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>{tab.label}</button>)}</div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><RefreshCw className="size-5 animate-spin text-indigo-400" /><span className="ml-3 text-sm text-gray-500">Loading…</span></div>
        : products.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3"><Package className="size-10 opacity-30" /><p className="text-sm">No products found</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-gray-50 bg-gray-50/50">{["Product", "SKU", "Category", "Price", "Stock", "Shop", "Status", ""].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">{products.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50/50 group">
              <td className="px-5 py-3.5"><div className="flex items-center gap-3">{p.image_url ? <img src={p.image_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-gray-100" /> : <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center"><Package className="size-4 text-gray-400" /></div>}<span className="text-xs font-medium text-gray-800 max-w-[180px] truncate">{p.title}</span></div></td>
              <td className="px-5 py-3.5"><span className="font-mono text-xs text-gray-500">{p.sku || "—"}</span></td>
              <td className="px-5 py-3.5 text-xs text-gray-500">{p.categories?.name || "—"}</td>
              <td className="px-5 py-3.5"><span className="text-xs font-bold text-gray-900">{Number(p.price).toFixed(2)}</span></td>
              <td className="px-5 py-3.5"><StockBadge qty={p.stock_quantity} /></td>
              <td className="px-5 py-3.5 text-xs text-gray-500">{p.shops?.name || "—"}</td>
              <td className="px-5 py-3.5"><button onClick={() => toggleActive(p.id, p.is_active)} className={"text-[11px] font-semibold px-2.5 py-1 rounded-full transition-all " + (p.is_active ? "bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-600" : "bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600")}>{p.is_active ? "Active" : "Inactive"}</button></td>
              <td className="px-5 py-3.5"><a href={"/admin/products/" + p.id} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium opacity-0 group-hover:opacity-100">Edit →</a></td>
            </tr>
          ))}</tbody>
        </table></div>}
        {pagination.pages > 1 && <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50"><span className="text-xs text-gray-500">Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</span><div className="flex items-center gap-1"><button onClick={() => hp(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="size-4 text-gray-600"/></button>{Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => { const pg = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i; return <button key={pg} onClick={() => hp(pg)} className={"w-7 h-7 text-xs rounded-lg font-medium " + (pg === page ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-600")}>{pg}</button>; })}<button onClick={() => hp(page + 1)} disabled={page >= pagination.pages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="size-4 text-gray-600"/></button></div></div>}
      </div>
    </div>
  );
}
