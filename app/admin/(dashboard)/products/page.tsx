/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminPagination } from "@/components/admin/pagination";
import { Search, Plus, Eye, EyeOff, Trash2, Package, Filter, X, Edit3, Download } from "lucide-react";

type Category = { id: string; name: string };
type ProductRow = {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock_count: number;
  image_url: string | null;
  is_active: boolean;
  rating: number;
  review_count: number;
  created_at: string;
  categories: Category | null;
  brands: { id: string; name: string } | null;
  shops: { id: string; name: string; slug: string } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function AdminProductsPage() {
  const [items, setItems] = useState<ProductRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch("/api/admin/categories").then((r) => r.json()).then((d) => setCategories(d.items || [])).catch(() => {});
  }, []);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category_id", categoryFilter);
    if (stockFilter) params.set("stock", stockFilter);
    if (statusFilter) params.set("is_active", statusFilter);
    try {
      const res = await fetch(`/api/admin/products?${params}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch { setItems([]); } finally { setLoading(false); }
  }, [search, categoryFilter, stockFilter, statusFilter]);

  useEffect(() => { const t = setTimeout(() => load(1), 300); return () => clearTimeout(t); }, [load]);

  const toggleActive = async (item: ProductRow) => {
    await fetch(`/api/admin/products/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !item.is_active }) });
    load(pagination.page);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load(pagination.page);
  };

  const hasFilters = categoryFilter || stockFilter || statusFilter;

  const exportCSV = () => {
    if (items.length === 0) return;
    const headers = ["#", "Name", "SKU", "Category", "Price", "Compare Price", "Stock", "Rating", "Reviews", "Shop", "Status"];
    const rows = items.map((p, i) => [
      i + 1,
      `"${p.title.replace(/"/g, '""')}"`,
      p.sku || "-",
      p.categories?.name || "-",
      Number(p.price).toFixed(2),
      p.compare_at_price ? Number(p.compare_at_price).toFixed(2) : "-",
      p.stock_count,
      Number(p.rating).toFixed(1),
      p.review_count,
      `"${(p.shops?.name || "-").replace(/"/g, '""')}"`,
      p.is_active ? "Active" : "Hidden",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-products-page${pagination.page}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total products</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={items.length === 0}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Link href="/admin/products/add">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Plus className="size-4" /> Add Product</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input placeholder="Search products by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`gap-2 ${hasFilters ? "border-indigo-300 text-indigo-600" : ""}`}>
            <Filter className="size-4" /> Filters
            {hasFilters && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">{[categoryFilter, stockFilter, statusFilter].filter(Boolean).length}</span>}
          </Button>
        </div>
        {showFilters && (
          <div className="px-4 pb-4 flex flex-wrap gap-3 border-t border-gray-50 pt-3">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Stock</option>
              <option value="in_stock">In Stock (&gt;10)</option>
              <option value="low_stock">Low Stock (1-10)</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Hidden</option>
            </select>
            {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setCategoryFilter(""); setStockFilter(""); setStatusFilter(""); }} className="text-gray-500 gap-1"><X className="size-3" /> Clear</Button>}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Stock</th>
                <th className="px-4 py-3 text-left">Rating</th>
                <th className="px-4 py-3 text-left">Shop</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400"><div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /><span className="text-sm">Loading...</span></div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400"><Package className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No products found</p></td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                        {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="size-4 text-gray-300" /></div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{item.title}</p>
                        {item.sku && <p className="text-[11px] text-gray-400">SKU: {item.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{item.categories?.name || "—"}</span></td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">${Number(item.price).toFixed(2)}</p>
                    {item.compare_at_price && <p className="text-[11px] text-gray-400 line-through">${Number(item.compare_at_price).toFixed(2)}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.stock_count === 0 ? "bg-red-50 text-red-600" : item.stock_count <= 10 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{item.stock_count}</span>
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1"><span className="text-amber-500 text-xs">★</span><span className="text-xs text-gray-700">{Number(item.rating).toFixed(1)}</span><span className="text-[10px] text-gray-400">({item.review_count})</span></div></td>
                  <td className="px-4 py-3"><span className="text-xs text-gray-600 truncate max-w-[100px] block">{item.shops?.name || "—"}</span></td>
                  <td className="px-4 py-3"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{item.is_active ? "Active" : "Hidden"}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/product/${item.slug}`} target="_blank" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Preview">
                        <Eye className="size-4 text-indigo-400" />
                      </Link>
                      <button onClick={() => toggleActive(item)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title={item.is_active ? "Hide" : "Show"}>
                        {item.is_active ? <EyeOff className="size-4 text-gray-400" /> : <Eye className="size-4 text-emerald-500" />}
                      </button>
                      <button onClick={() => {
                        const newTitle = prompt("Edit product title:", item.title);
                        if (newTitle && newTitle !== item.title) {
                          fetch(`/api/admin/products/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: newTitle }) }).then(() => load(pagination.page));
                        }
                      }} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Edit">
                        <Edit3 className="size-4 text-amber-500" />
                      </button>
                      <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="size-4 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={(p) => load(p)} />
      </div>
    </div>
  );
}
