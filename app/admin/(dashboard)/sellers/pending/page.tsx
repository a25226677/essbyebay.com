"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPagination } from "@/components/admin/pagination";
import { Search, Store, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

type Shop = {
  id: string;
  name: string;
  slug: string;
  is_verified: boolean;
  rating: number;
  product_count: number;
  created_at: string;
  profiles: { id: string; full_name: string; phone: string; is_active: boolean } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function PendingSellersPage() {
  const [items, setItems] = useState<Shop[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", is_verified: "false" });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/admin/shops?${params}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch { setItems([]); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(() => load(1), 300); return () => clearTimeout(t); }, [load]);

  const approve = async (shop: Shop) => {
    await fetch(`/api/admin/shops/${shop.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_verified: true }) });
    load(pagination.page);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pending Seller Approval</h1>
        <p className="text-sm text-gray-500 mt-0.5">{pagination.total} pending shops</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input placeholder="Search shops..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Shop</th>
                <th className="px-4 py-3 text-left">Owner</th>
                <th className="px-4 py-3 text-left">Products</th>
                <th className="px-4 py-3 text-left">Applied</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-16 text-gray-400"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-16 text-gray-400"><Store className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No pending shops</p></td></tr>
              ) : items.map((shop) => (
                <tr key={shop.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{shop.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{shop.profiles?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{shop.product_count}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(shop.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => approve(shop)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">
                      <CheckCircle className="size-3.5" /> Approve
                    </button>
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
