"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AdminPagination } from "@/components/admin/pagination";
import { Search, Filter, X, ShoppingCart, ChevronDown, Eye } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  shipped: "bg-cyan-50 text-cyan-700",
  delivered: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
  refunded: "bg-purple-50 text-purple-700",
};

const PAYMENT_COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  succeeded: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  refunded: "bg-purple-50 text-purple-700",
};

type OrderRow = {
  id: string;
  total_amount: number;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  profiles: { id: string; full_name: string; phone: string } | null;
  order_items: { id: string; quantity: number; unit_price: number }[];
};

type Pagination = { page: number; limit: number; total: number; pages: number };

export default function AdminOrdersPage() {
  const [items, setItems] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (paymentFilter) params.set("payment_status", paymentFilter);
    if (dateFilter) params.set("date", dateFilter);
    try {
      const res = await fetch(`/api/admin/orders?${params}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch { setItems([]); } finally { setLoading(false); }
  }, [search, statusFilter, paymentFilter, dateFilter]);

  useEffect(() => { const t = setTimeout(() => load(1), 300); return () => clearTimeout(t); }, [load]);

  const updateStatus = async (item: OrderRow, newStatus: string) => {
    await fetch(`/api/admin/orders/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    load(pagination.page);
  };

  const updatePayment = async (item: OrderRow, newStatus: string) => {
    await fetch(`/api/admin/orders/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment_status: newStatus }),
    });
    load(pagination.page);
  };

  const hasFilters = statusFilter || paymentFilter || dateFilter;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total orders</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input placeholder="Search by order ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={`gap-2 ${hasFilters ? "border-indigo-300 text-indigo-600" : ""}`}>
            <Filter className="size-4" /> Filters
            {hasFilters && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full px-1.5 py-0.5">{[statusFilter, paymentFilter, dateFilter].filter(Boolean).length}</span>}
          </Button>
        </div>
        {showFilters && (
          <div className="px-4 pb-4 flex flex-wrap gap-3 border-t border-gray-50 pt-3">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Payments</option>
              <option value="pending">Pending</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="this_month">This Month</option>
            </select>
            {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setPaymentFilter(""); setDateFilter(""); }} className="text-gray-500 gap-1"><X className="size-3" /> Clear</Button>}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-sm mt-2">Loading...</p></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400"><ShoppingCart className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No orders found</p></td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-medium text-indigo-600">#{item.id.slice(0, 8).toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{item.profiles?.full_name || "Walk-in"}</p>
                    {item.profiles?.phone && <p className="text-[11px] text-gray-400">{item.profiles.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{Array.isArray(item.order_items) ? item.order_items.length : 0} items</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">${Number(item.total_amount || 0).toFixed(2)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative group inline-block">
                      <button className={`text-[11px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${STATUS_COLOR[item.status] || "bg-gray-100 text-gray-600"}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        <ChevronDown className="size-3" />
                      </button>
                      <div className="absolute z-20 left-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 hidden group-hover:block min-w-[130px]">
                        {["pending", "processing", "shipped", "delivered", "cancelled", "refunded"].map((s) => (
                          <button key={s} onClick={() => updateStatus(item, s)} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${item.status === s ? "font-semibold text-indigo-600" : "text-gray-700"}`}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative group inline-block">
                      <button className={`text-[11px] font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${PAYMENT_COLOR[item.payment_status] || "bg-gray-100 text-gray-600"}`}>
                        {item.payment_status.charAt(0).toUpperCase() + item.payment_status.slice(1)}
                        <ChevronDown className="size-3" />
                      </button>
                      <div className="absolute z-20 left-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 hidden group-hover:block min-w-[120px]">
                        {["pending", "succeeded", "failed", "refunded"].map((s) => (
                          <button key={s} onClick={() => updatePayment(item, s)} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${item.payment_status === s ? "font-semibold text-indigo-600" : "text-gray-700"}`}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        const d = document.getElementById(`order-detail-${item.id}`);
                        if (d) d.classList.toggle("hidden");
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      title="View order"
                    >
                      <Eye className="size-4 text-indigo-500" />
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
