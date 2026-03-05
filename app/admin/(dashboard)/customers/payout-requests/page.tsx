"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

type PayoutRequest = {
  id: string; amount: number; method: string; account_info: string | null;
  status: string; admin_note: string | null; created_at: string;
  profiles: { id: string; full_name: string; phone: string; wallet_balance: number } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fef3c7", color: "#d97706" },
  approved: { bg: "#dbeafe", color: "#2563eb" },
  rejected: { bg: "#fee2e2", color: "#dc2626" },
  paid:     { bg: "#d1fae5", color: "#059669" },
};

export default function PayoutRequestsPage() {
  const [items, setItems]           = useState<PayoutRequest[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]             = useState(1);
  const [actionId, setActionId]     = useState<string | null>(null);

  const fetchItems = useCallback(async (overrides?: { status?: string; page?: number }) => {
    setLoading(true);
    const st = overrides?.status ?? statusFilter;
    const p  = overrides?.page ?? page;
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (st) params.set("status", st);
    try {
      const res  = await fetch(`/api/admin/customers/payout-requests?${params}`);
      const json = await res.json();
      setItems(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [statusFilter, page]);

  useEffect(() => { fetchItems(); }, []); // eslint-disable-line

  const handleAction = async (id: string, status: string) => {
    setActionId(id);
    await fetch("/api/admin/customers/payout-requests", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setActionId(null);
    fetchItems();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-800">Payout Requests</span>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); fetchItems({ status: e.target.value }); }}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="paid">Paid</option>
          </select>
          <button onClick={() => fetchItems()} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <RefreshCw className={`size-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <RefreshCw className="size-5 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <span className="text-4xl">💸</span><p className="text-sm">No payout requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Customer","Amount","Method","Account Info","Status","Date","Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const c = STATUS_MAP[item.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{item.profiles?.full_name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">${Number(item.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize">{item.method.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{item.account_info || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                          style={{ background: c.bg, color: c.color }}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {item.status === "pending" && (
                            <>
                              <button onClick={() => handleAction(item.id, "approved")} disabled={actionId === item.id}
                                className="p-1.5 rounded-lg bg-green-100 hover:bg-green-200 disabled:opacity-50">
                                <CheckCircle2 className="size-3.5 text-green-600" />
                              </button>
                              <button onClick={() => handleAction(item.id, "rejected")} disabled={actionId === item.id}
                                className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 disabled:opacity-50">
                                <XCircle className="size-3.5 text-red-600" />
                              </button>
                            </>
                          )}
                          {item.status === "approved" && (
                            <button onClick={() => handleAction(item.id, "paid")} disabled={actionId === item.id}
                              className="text-[11px] font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                              {actionId === item.id ? "…" : "Mark Paid"}
                            </button>
                          )}
                          {(item.status === "paid" || item.status === "rejected") && (
                            <span className="text-[11px] text-gray-400">{item.status === "paid" ? "Completed" : "Declined"}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => { const p = page - 1; setPage(p); fetchItems({ page: p }); }} disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              <button onClick={() => { const p = page + 1; setPage(p); fetchItems({ page: p }); }} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
