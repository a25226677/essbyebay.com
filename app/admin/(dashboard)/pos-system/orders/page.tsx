"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AdminPagination } from "@/components/admin/pagination";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-cyan-100 text-cyan-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
};

type OrderRow = {
  id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  profiles: { id: string; full_name: string; phone: string } | null;
  order_items: { id: string; quantity: number; unit_price: number }[];
};

type Pagination = { page: number; limit: number; total: number; pages: number };

export default function POSOrdersPage() {
  const [items, setItems] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
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
      <h1 className="text-xl font-bold text-gray-900">POS Orders</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input placeholder="Search POS orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Order ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400"><ShoppingCart className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No POS orders found</p></td></tr>
              ) : items.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-medium">#{order.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3 text-xs text-gray-700">{order.profiles?.full_name || "Walk-in"}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{Array.isArray(order.order_items) ? order.order_items.reduce((s, i) => s + i.quantity, 0) : 0}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-gray-900">${Number(order.total_amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${order.payment_status === "succeeded" ? "bg-green-100 text-green-700" : order.payment_status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
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
