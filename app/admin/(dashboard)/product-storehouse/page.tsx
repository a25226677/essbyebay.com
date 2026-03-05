/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw, Package, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Pencil, Copy, Trash2, Settings2, Plus,
} from "lucide-react";
import Link from "next/link";

type Product = {
  id: string; title: string; slug: string | null; sku: string | null;
  price: number; compare_at_price: number | null; stock_count: number;
  image_url: string | null; is_active: boolean; today_deal: boolean;
  is_featured: boolean; sale_count: number; rating: number; review_count: number;
  categories: { id: string; name: string } | null;
  brands: { id: string; name: string } | null;
  shops: { id: string; name: string } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

// Small inline toggle
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? "bg-emerald-500" : "bg-gray-300"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4.5" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function ProductStorehousePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [toggling, setToggling] = useState<Record<string, boolean>>({});
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProducts = useCallback(async (ov?: { search?: string; sort?: string; page?: number }) => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(ov?.page ?? page), limit: "20" });
    const s = ov?.search ?? search;
    const sort = ov?.sort ?? sortBy;
    if (s) p.set("search", s);
    if (sort === "price_asc") p.set("sort_by", "price"); // pass through for future API support
    if (sort === "price_desc") p.set("sort_by", "price_desc");
    if (sort === "newest") p.set("sort_by", "newest");
    try {
      const r = await fetch("/api/admin/products?" + p);
      const j = await r.json();
      setProducts(j.items || []);
      setPagination(j.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch {} finally { setLoading(false); }
  }, [search, sortBy, page]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const patch = async (id: string, field: string, val: boolean) => {
    const key = `${id}_${field}`;
    setToggling((t) => ({ ...t, [key]: true }));
    // Optimistic update
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: val } : p));
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: val }),
      });
    } catch {
      // revert
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, [field]: !val } : p));
    } finally { setToggling((t) => ({ ...t, [key]: false })); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    loadProducts();
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); loadProducts({ search: v, page: 1 }); }, 400);
  };

  const toggleSelect = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(selected.size === products.length ? new Set() : new Set(products.map((p) => p.id)));

  const applyBulk = async () => {
    if (!bulkAction || selected.size === 0) return;
    const ids = [...selected];
    if (bulkAction === "delete") {
      if (!confirm(`Delete ${ids.length} products?`)) return;
      await Promise.all(ids.map((id) => fetch(`/api/admin/products/${id}`, { method: "DELETE" })));
    } else if (bulkAction === "activate") {
      await Promise.all(ids.map((id) => fetch(`/api/admin/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: true }) })));
    } else if (bulkAction === "deactivate") {
      await Promise.all(ids.map((id) => fetch(`/api/admin/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: false }) })));
    }
    setSelected(new Set());
    setBulkAction("");
    loadProducts();
  };

  const goPage = (pg: number) => { setPage(pg); loadProducts({ page: pg }); };

  // Sort products client-side if needed
  const displayed = [...products].sort((a, b) => {
    if (sortBy === "price_asc") return a.price - b.price;
    if (sortBy === "price_desc") return b.price - a.price;
    if (sortBy === "stock_desc") return b.stock_count - a.stock_count;
    if (sortBy === "stock_asc") return a.stock_count - b.stock_count;
    if (sortBy === "name") return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-800">Product Storehouse</h1>
        <Link
          href="/admin/products/add"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          <Plus className="size-4" /> Add New Product
        </Link>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Card header — filter bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
          <h2 className="text-sm font-bold text-gray-800 shrink-0">Product Storehouse</h2>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Bulk Action */}
            <div className="relative flex items-center gap-1">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="appearance-none h-9 pl-3 pr-8 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="">Bulk Action</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
                <option value="delete">Delete</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
              {bulkAction && selected.size > 0 && (
                <button onClick={applyBulk} className="h-9 px-3 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Apply</button>
              )}
            </div>
            {/* Sort by */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none h-9 pl-3 pr-8 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-indigo-400 cursor-pointer min-w-[110px]"
              >
                <option value="">Sort by</option>
                <option value="name">Name</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
                <option value="stock_desc">Stock: High → Low</option>
                <option value="stock_asc">Stock: Low → High</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
            </div>
            {/* Search */}
            <input
              type="text"
              placeholder="Type & Enter"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-9 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-400 w-36"
            />
            <button onClick={() => loadProducts()} className="h-9 w-9 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCw className={"size-4 text-gray-500 " + (loading ? "animate-spin" : "")} />
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <RefreshCw className="size-5 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-3">
            <Package className="size-12" /><p className="text-sm text-gray-400">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === products.length && products.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                    />
                  </th>
                  {["Name", "Info", "Total Stock", "Todays Deal", "Published", "Featured", "Options"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50/40 transition-colors ${selected.has(p.id) ? "bg-indigo-50/30" : ""}`}>
                    {/* Checkbox */}
                    <td className="w-10 px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="w-4 h-4 rounded border-gray-300 accent-indigo-600 cursor-pointer"
                      />
                    </td>

                    {/* Name + image */}
                    <td className="px-4 py-3.5 min-w-[220px] max-w-[260px]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 shrink-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="size-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{p.title}</p>
                      </div>
                    </td>

                    {/* Info */}
                    <td className="px-4 py-3.5 min-w-[160px]">
                      <div className="text-[11px] text-gray-500 space-y-0.5 leading-relaxed">
                        <div>Num of Sale: <span className="text-gray-700 font-medium">{p.sale_count} Times</span></div>
                        <div>Base Price: <span className="text-gray-700 font-medium">${Number(p.price).toFixed(2)}</span></div>
                        <div>Rating: <span className="text-gray-700 font-medium">{Number(p.rating).toFixed(1)}</span></div>
                      </div>
                    </td>

                    {/* Total Stock */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-gray-700">{p.stock_count}</span>
                    </td>

                    {/* Todays Deal */}
                    <td className="px-4 py-3.5">
                      <Toggle
                        checked={p.today_deal}
                        onChange={() => patch(p.id, "today_deal", !p.today_deal)}
                        disabled={toggling[`${p.id}_today_deal`]}
                      />
                    </td>

                    {/* Published */}
                    <td className="px-4 py-3.5">
                      <Toggle
                        checked={p.is_active}
                        onChange={() => patch(p.id, "is_active", !p.is_active)}
                        disabled={toggling[`${p.id}_is_active`]}
                      />
                    </td>

                    {/* Featured */}
                    <td className="px-4 py-3.5">
                      <Toggle
                        checked={p.is_featured}
                        onChange={() => patch(p.id, "is_featured", !p.is_featured)}
                        disabled={toggling[`${p.id}_is_featured`]}
                      />
                    </td>

                    {/* Options */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {/* View */}
                        <Link
                          href={`/product/${p.slug || p.id}`}
                          target="_blank"
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ background: "#d1fae5", color: "#059669" }}
                          title="View"
                        >
                          <Eye className="size-3.5" />
                        </Link>
                        {/* Edit */}
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ background: "#dbeafe", color: "#2563eb" }}
                          title="Edit"
                        >
                          <Pencil className="size-3.5" />
                        </Link>
                        {/* Duplicate */}
                        <button
                          onClick={async () => {
                            await fetch("/api/admin/products", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ title: `${p.title} (Copy)`, price: p.price, stock_count: p.stock_count, image_url: p.image_url }),
                            });
                            loadProducts();
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ background: "#fef3c7", color: "#d97706" }}
                          title="Duplicate"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => deleteProduct(p.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ background: "#fee2e2", color: "#dc2626" }}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                        {/* Settings / edit detail */}
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ background: "#f3f4f6", color: "#6b7280" }}
                          title="Settings"
                        >
                          <Settings2 className="size-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} products
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => goPage(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const pg = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return (
                  <button key={pg} onClick={() => goPage(pg)} className={`w-7 h-7 text-xs rounded-lg font-medium ${pg === page ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-600"}`}>{pg}</button>
                );
              })}
              <button onClick={() => goPage(page + 1)} disabled={page >= pagination.pages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30">
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}