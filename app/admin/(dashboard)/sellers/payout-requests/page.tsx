"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, ChevronLeft, ChevronRight, Eye, X, Check } from "lucide-react";

type Withdrawal = {
  id: string; amount: number; status: string; method: string; withdraw_type: string;
  account_info: string | null; notes: string | null; created_at: string; shop_name: string | null;
  profiles: { id: string; full_name: string | null; phone: string | null; wallet_balance: number } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: "#dbeafe", color: "#2563eb", label: "Pending" },
  paid:     { bg: "#d1fae5", color: "#059669", label: "Paid" },
  refused:  { bg: "#fee2e2", color: "#dc2626", label: "Refuse" },
  rejected: { bg: "#fee2e2", color: "#dc2626", label: "Refuse" },
};

function PayoutRequestsInner() {
  const searchParams = useSearchParams();
  const preselectedSeller = searchParams.get("seller_id") || "";

  const [items, setItems]           = useState<Withdrawal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]             = useState(1);
  const [actionId, setActionId]     = useState<string | null>(null);
  const [viewItem, setViewItem]     = useState<Withdrawal | null>(null);
  const [refuseModalOpen, setRefuseModalOpen] = useState(false);
  const [refuseReason, setRefuseReason] = useState("");
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const fetchItems = useCallback(async (overrides?: { status?: string; page?: number }) => {
    setLoading(true);
    const st = overrides?.status ?? statusFilter;
    const p  = overrides?.page ?? page;
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (st) params.set("status", st);
    if (preselectedSeller) params.set("seller_id", preselectedSeller);
    try {
      const res  = await fetch(`/api/admin/withdrawals?${params}`);
      const json = await res.json();
      setItems(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [statusFilter, page, preselectedSeller]);

  useEffect(() => { fetchItems(); }, []); // eslint-disable-line

  const performAction = async (id: string, status: string, notes?: string | null) => {
    setActionId(id);
    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, notes }),
      });
      if (res.ok) {
        showToast(status === "paid" ? "Marked as paid" : "Refused");
        fetchItems();
      } else {
        showToast("Action failed", false);
      }
    } catch (err) {
      showToast("Action failed", false);
    } finally {
      setActionId(null);
    }
  };

  const handleAction = async (id: string, status: string) => {
    // When refusing, prompt for a reason
    if (status === "refused") {
      setSelectedActionId(id);
      setRefuseReason("");
      setRefuseModalOpen(true);
      return;
    }
    await performAction(id, status);
  };

  const offset = (page - 1) * pagination.limit;

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${toast.ok ? "bg-green-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Seller Withdraw Request</h1>
        <span className="text-xs text-gray-500">{pagination.total} total requests</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); fetchItems({ status: e.target.value }); }}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="refused">Refused</option>
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
            <span className="text-4xl">💸</span><p className="text-sm">No withdraw requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#","Date","Seller","Total Amount to Pay","Requested Amount","Type","Withdraw Type","Message","Status","Options"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => {
                  const c = STATUS_MAP[item.status] ?? { bg: "#f3f4f6", color: "#6b7280", label: item.status };
                  const sellerName   = item.profiles?.full_name || "—";
                  const shopName     = item.shop_name || "xxx";
                  const walletBal    = Number(item.profiles?.wallet_balance ?? 0);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs text-gray-400">{offset + idx + 1}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-800">{sellerName}</p>
                        <p className="text-[11px] text-gray-500">({shopName})</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">${walletBal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-orange-600">${Number(item.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">User Balance</td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize">{(item.withdraw_type || item.method || "Bank").replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{item.notes || item.account_info || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: c.bg, color: c.color }}>{c.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* View */}
                          <button onClick={() => setViewItem(item)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100" title="View">
                            <Eye className="size-3.5 text-emerald-600" />
                          </button>
                          {/* Approve / Mark Paid */}
                          {(item.status === "pending" || item.status === "approved") && (
                            <button onClick={() => handleAction(item.id, "paid")} disabled={actionId === item.id}
                              className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 disabled:opacity-50" title="Mark Paid">
                              <Check className="size-3.5 text-orange-600" />
                            </button>
                          )}
                          {/* Refuse */}
                          {item.status === "pending" && (
                            <button onClick={() => handleAction(item.id, "refused")} disabled={actionId === item.id}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-50" title="Refuse">
                              <X className="size-3.5 text-red-600" />
                            </button>
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
            <span className="text-xs text-gray-500">Showing {offset + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => { const p = page - 1; setPage(p); fetchItems({ page: p }); }} disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return <button key={p} onClick={() => { setPage(p); fetchItems({ page: p }); }}
                  className={`w-7 h-7 text-xs rounded-lg font-medium ${p === page ? "bg-orange-500 text-white" : "hover:bg-gray-100 text-gray-600"}`}>{p}</button>;
              })}
              <button onClick={() => { const p = page + 1; setPage(p); fetchItems({ page: p }); }} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Detail Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Withdrawal Detail</h2>
              <button onClick={() => setViewItem(null)}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-3 text-sm">
              {[
                ["Seller", viewItem.profiles?.full_name || "—"],
                ["Shop",   viewItem.shop_name || "—"],
                ["Amount", `$${Number(viewItem.amount).toFixed(2)}`],
                ["Wallet Balance", `$${Number(viewItem.profiles?.wallet_balance ?? 0).toFixed(2)}`],
                ["Withdraw Type", (viewItem.withdraw_type || viewItem.method || "Bank").toUpperCase()],
                ["Account / UPI Info", viewItem.account_info || viewItem.notes || "—"],
                ["Status", viewItem.status],
                ["Date", new Date(viewItem.created_at).toLocaleString()],
              ].map(([label, val]) => (
                <div key={label} className="flex items-start gap-3 text-xs">
                  <span className="text-gray-500 w-36 shrink-0">{label}:</span>
                  <span className="font-semibold text-gray-800">{val}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              {viewItem.status === "pending" && (
                <>
                  <button onClick={() => { setSelectedActionId(viewItem.id); setRefuseModalOpen(true); setViewItem(null); }}
                    className="text-sm font-semibold text-red-600 px-4 py-2 rounded-xl border border-red-200 hover:bg-red-50">Refuse</button>
                  <button onClick={() => { handleAction(viewItem.id, "paid"); setViewItem(null); }}
                    className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl">Mark Paid</button>
                </>
              )}
              <button onClick={() => setViewItem(null)} className="text-sm text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Refuse Reason Modal */}
      {refuseModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Refuse Withdrawal</h2>
              <button onClick={() => { setRefuseModalOpen(false); setSelectedActionId(null); }}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5">
              <label className="text-sm text-gray-600 mb-2 block">Reason for refusal</label>
              <textarea value={refuseReason} onChange={(e) => setRefuseReason(e.target.value)} rows={5} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-sky-500 outline-none resize-y" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setRefuseModalOpen(false); setSelectedActionId(null); }} className="text-sm text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={() => {
                if (!selectedActionId) return;
                performAction(selectedActionId, "refused", refuseReason || null);
                setRefuseModalOpen(false);
                setSelectedActionId(null);
              }} className="text-sm font-semibold bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl">Confirm Refuse</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PayoutRequestsPage() {
  return <Suspense fallback={<div className="flex items-center justify-center py-24 text-gray-400 gap-3"><RefreshCw className="size-5 animate-spin" /><span>Loading…</span></div>}><PayoutRequestsInner /></Suspense>;
}
