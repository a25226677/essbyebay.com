"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, Download, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

/* ─── Types ─────────────────────────────────────────── */
type OrderItem = {
  id: string; quantity: number; unit_price: number; line_total: number;
  profiles: { full_name: string } | null;
};
type Order = {
  id: string; order_code: string; status: string; payment_status: string;
  payment_method: string; delivery_status: string; pickup_status: string;
  tracking_code: string | null; subtotal: number; total_amount: number;
  profit: number; num_products: number; shop_name: string | null;
  created_at: string;
  profiles: { id: string; full_name: string; phone: string } | null;
  order_items: OrderItem[];
};
type Pagination = { page: number; limit: number; total: number; pages: number };

const DELIVERY_STATUSES = [
  { value: "", label: "All Delivery Status" },
  { value: "pending",    label: "Pending" },
  { value: "confirmed",  label: "Confirmed" },
  { value: "picked_up",  label: "Picked Up" },
  { value: "on_the_way", label: "On The Way" },
  { value: "delivered",  label: "Delivered" },
];

function PickupBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    unpicked_up: { bg: "#fee2e2", color: "#dc2626", label: "Unpicked Up" },
    picked_up:   { bg: "#d1fae5", color: "#059669", label: "Picked Up" },
  };
  const c = map[status] ?? map.unpicked_up;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

function DeliveryBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending:    { bg: "#fef3c7", color: "#d97706" },
    confirmed:  { bg: "#dbeafe", color: "#2563eb" },
    picked_up:  { bg: "#d1fae5", color: "#059669" },
    on_the_way: { bg: "#e0f2fe", color: "#0284c7" },
    delivered:  { bg: "#dcfce7", color: "#16a34a" },
  };
  const c = map[status] ?? { bg: "#f3f4f6", color: "#6b7280" };
  const label = status ? status.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase()) : "—";
  return (
    <span className="inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}>{label}</span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: "#fee2e2", color: "#dc2626", label: "Un-Paid" },
    unpaid:    { bg: "#fee2e2", color: "#dc2626", label: "Un-Paid" },
    "un-paid": { bg: "#fee2e2", color: "#dc2626", label: "Un-Paid" },
    succeeded: { bg: "#d1fae5", color: "#059669", label: "Paid" },
    paid:      { bg: "#d1fae5", color: "#059669", label: "Paid" },
    failed:    { bg: "#fee2e2", color: "#dc2626", label: "Failed" },
    refunded:  { bg: "#e0e7ff", color: "#4338ca", label: "Refunded" },
  };
  const c = map[status] ?? { bg: "#fee2e2", color: "#dc2626", label: "Un-Paid" };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

export default function AllOrdersPage() {
  const router = useRouter();
  const [orders, setOrders]         = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchOrders = useCallback(async (overrides?: {
    delivery_status?: string; date?: string; search?: string; page?: number;
  }) => {
    setLoading(true);
    const ds = overrides?.delivery_status ?? deliveryFilter;
    const dt = overrides?.date ?? dateFilter;
    const s  = overrides?.search ?? search;
    const p  = overrides?.page ?? page;
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (ds) params.set("delivery_status", ds);
    if (dt) params.set("from", dt);
    if (s)  params.set("search", s);
    try {
      const res  = await fetch(`/api/admin/orders?${params}`);
      const json = await res.json();
      setOrders(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [deliveryFilter, dateFilter, search, page]);

  useEffect(() => { fetchOrders(); }, []); // eslint-disable-line

  const applyFilter = () => { setPage(1); fetchOrders({ page: 1 }); };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { setPage(1); fetchOrders({ search, page: 1 }); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === orders.length) setSelected(new Set());
    else setSelected(new Set(orders.map((o) => o.id)));
  };

  const handleBulkApply = async () => {
    if (!bulkAction || selected.size === 0) return;
    if (bulkAction === "delete") {
      if (!confirm(`Delete ${selected.size} order(s)? This cannot be undone.`)) return;
      await Promise.all([...selected].map((id) => fetch(`/api/admin/orders/${id}`, { method: "DELETE" })));
      setSelected(new Set());
      fetchOrders();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
    setDeleting(null);
    fetchOrders();
  };

  const downloadInvoice = (order: Order) => {
    const lines = (order.order_items || []).map((i, idx) =>
      `${idx + 1}. Qty:${i.quantity} x $${Number(i.unit_price).toFixed(2)} = $${Number(i.line_total).toFixed(2)}`
    ).join("\n");
    const text = [
      `INVOICE - ${order.order_code}`,
      `Customer: ${order.profiles?.full_name ?? "-"}`,
      `Date: ${new Date(order.created_at).toLocaleString()}`,
      `Payment: ${order.payment_method} | ${order.payment_status}`,
      `Delivery: ${order.delivery_status}`,
      "", lines, "",
      `Total: $${Number(order.total_amount).toFixed(2)}`,
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `invoice-${order.order_code}.txt`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-800 shrink-0">All Orders</span>

          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer min-w-[130px]">
            <option value="">Bulk Action</option>
            <option value="delete">Delete Selected</option>
          </select>

          {bulkAction && selected.size > 0 && (
            <button onClick={handleBulkApply}
              className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors">
              Apply ({selected.size})
            </button>
          )}

          <select value={deliveryFilter} onChange={(e) => setDeliveryFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer min-w-[185px]">
            {DELIVERY_STATUSES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>

          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 min-w-[150px]" />

          <input ref={searchRef} type="text" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={handleSearchKey}
            placeholder="Type Order code & hit Enter"
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 min-w-[220px] flex-1" />

          <button onClick={applyFilter}
            className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg transition-colors shrink-0">
            Filter
          </button>

          <button onClick={() => fetchOrders()} title="Refresh"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`size-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <RefreshCw className="size-5 animate-spin" />
            <span className="text-sm">Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <span className="text-4xl">📦</span>
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left w-10">
                    <input type="checkbox"
                      checked={selected.size === orders.length && orders.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer" />
                  </th>
                  {["Order Code","Shop","Num. of Products","Customer","Amount","Profit",
                    "Pick Up Status","Delivery Status","Payment Status","Refund","Options"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-gray-800">{order.order_code}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {order.shop_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-semibold text-gray-700">
                      {order.num_products ?? order.order_items?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-800">
                      {order.profiles?.full_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900">
                      ${Number(order.total_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-600">
                      ${Number(order.profit ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <PickupBadge status={order.pickup_status || "unpicked_up"} />
                    </td>
                    <td className="px-4 py-3">
                      <DeliveryBadge status={order.delivery_status || "pending"} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentBadge status={order.payment_status || "unpaid"} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {order.status === "refunded" || order.payment_status === "refunded"
                        ? <span className="text-purple-600 font-medium">Refunded</span>
                        : <span className="text-gray-400">No Refund</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => router.push(`/admin/sales/${order.id}`)}
                          title="View Order" className="p-1.5 rounded-lg" style={{ background: "#fff3e0" }}>
                          <Eye className="size-3.5" style={{ color: "#f97316" }} />
                        </button>
                        <button onClick={() => downloadInvoice(order)} title="Download Invoice"
                          className="p-1.5 rounded-lg" style={{ background: "#dbeafe" }}>
                          <Download className="size-3.5" style={{ color: "#2563eb" }} />
                        </button>
                        <button onClick={() => handleDelete(order.id)} disabled={deleting === order.id}
                          title="Delete Order" className="p-1.5 rounded-lg disabled:opacity-50"
                          style={{ background: "#fee2e2" }}>
                          {deleting === order.id
                            ? <RefreshCw className="size-3.5 animate-spin" style={{ color: "#dc2626" }} />
                            : <Trash2 className="size-3.5" style={{ color: "#dc2626" }} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => { const p = page - 1; setPage(p); fetchOrders({ page: p }); }}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return (
                  <button key={p} onClick={() => { setPage(p); fetchOrders({ page: p }); }}
                    className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                      p === page ? "bg-orange-500 text-white" : "hover:bg-gray-100 text-gray-600"
                    }`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => { const p = page + 1; setPage(p); fetchOrders({ page: p }); }}
                disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-right text-xs text-gray-400">{pagination.total.toLocaleString()} total orders</div>
    </div>
  );
}
