"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Package,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
type Order = {
  id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  profiles: { full_name: string } | null;
  order_items: { id: string }[];
};

type Pagination = { page: number; limit: number; total: number; pages: number };

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:    { bg: "#fef3c7", text: "#d97706" },
  paid:       { bg: "#dbeafe", text: "#2563eb" },
  processing: { bg: "#ede9fe", text: "#7c3aed" },
  shipped:    { bg: "#cffafe", text: "#0891b2" },
  delivered:  { bg: "#d1fae5", text: "#059669" },
  cancelled:  { bg: "#fee2e2", text: "#dc2626" },
  refunded:   { bg: "#e0e7ff", text: "#4338ca" },
};

const PAYMENT_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: "#fef3c7", text: "#d97706" },
  succeeded: { bg: "#d1fae5", text: "#059669" },
  failed:    { bg: "#fee2e2", text: "#dc2626" },
  refunded:  { bg: "#e0e7ff", text: "#4338ca" },
};

const DATE_PRESETS = [
  { value: "", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
];

const ORDER_STATUSES = ["", "pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];

function Badge({ status, map }: { status: string; map: Record<string, { bg: string; text: string }> }) {
  const c = map[status] ?? { bg: "#f3f4f6", text: "#6b7280" };
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.text }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function SalesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [datePreset, setDatePreset] = useState("");
  const [page, setPage] = useState(1);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(async (overrides?: { search?: string; status?: string; datePreset?: string; page?: number }) => {
    setLoading(true);
    const s = overrides?.search ?? search;
    const st = overrides?.status ?? status;
    const dp = overrides?.datePreset ?? datePreset;
    const p = overrides?.page ?? page;

    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    if (dp) params.set("date", dp);

    try {
      const res = await fetch(`/api/admin/orders?${params}`);
      const json = await res.json();
      setOrders(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, status, datePreset, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setPage(1); fetchOrders({ search: val, page: 1 }); }, 400);
  };

  const handleStatus = (st: string) => { setStatus(st); setPage(1); fetchOrders({ status: st, page: 1 }); };
  const handleDate = (dp: string) => { setDatePreset(dp); setPage(1); fetchOrders({ datePreset: dp, page: 1 }); };
  const handlePage = (p: number) => { setPage(p); fetchOrders({ page: p }); };

  const exportCSV = () => {
    const headers = ["Order ID", "Customer", "Items", "Total", "Status", "Payment", "Date"];
    const rows = orders.map((o) => [
      o.id,
      o.profiles?.full_name ?? "—",
      String(o.order_items?.length ?? 0),
      String(Number(o.total_amount).toFixed(2)),
      o.status,
      o.payment_status,
      new Date(o.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "orders.csv"; a.click();
  };

  const statusCounts = orders.reduce((acc: Record<string, number>, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Orders</h1>
          <p className="text-xs text-gray-500 mt-0.5">{pagination.total.toLocaleString()} total orders</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="text-xs border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg text-gray-600 transition-colors">
            Export CSV
          </button>
          <button onClick={() => fetchOrders()} className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48 focus-within:border-indigo-400 transition-colors">
            <Search className="size-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by order ID…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full"
            />
          </div>

          {/* Date preset */}
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-gray-400" />
            <select
              value={datePreset}
              onChange={(e) => handleDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white text-gray-700 focus:outline-none focus:border-indigo-400 cursor-pointer"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s || "all"}
              onClick={() => handleStatus(s)}
              className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                status === s
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
              {s && statusCounts[s] ? (
                <span className="ml-1.5 text-[10px] opacity-80">({statusCounts[s]})</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="size-5 animate-spin text-indigo-400" />
            <span className="ml-3 text-sm text-gray-500">Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Package className="size-10 opacity-30" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {["Order ID", "Customer", "Items", "Total", "Status", "Payment", "Date", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-indigo-600 font-semibold">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-gray-800">
                      {order.profiles?.full_name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">
                      {order.order_items?.length ?? 0} item{(order.order_items?.length ?? 0) !== 1 ? "s" : ""}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={order.status} map={STATUS_COLOR} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={order.payment_status} map={PAYMENT_COLOR} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                      <Clock className="size-3 inline mr-1" />
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/sales/${order.id}`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => handlePage(p)}
                    className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                      p === page ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => handlePage(page + 1)}
                disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Suppress unused import warning for these status icon components
const _unused = { CheckCircle2, XCircle, Truck };
void _unused;
