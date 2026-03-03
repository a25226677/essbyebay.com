"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPagination } from "@/components/admin/pagination";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Order = {
  id: string;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  profiles: { full_name: string } | null;
  order_items: { id: string }[];
};
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function InvoicesPage() {
  const [items, setItems] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", payment_status: "succeeded" });
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch { setItems([]); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(() => load(1), 300); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-gray-500 mt-0.5">Paid orders with invoice details &middot; {pagination.total} invoices</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input placeholder="Search invoices by order ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Invoice #</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Order Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400"><FileText className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No invoices found</p></td></tr>
              ) : items.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-indigo-600">INV-{o.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{o.profiles?.full_name || "Walk-in"}</td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">{o.order_items?.length || 0}</td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(o.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      o.status === "delivered" ? "bg-emerald-100 text-emerald-700" :
                      o.status === "shipped" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
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
