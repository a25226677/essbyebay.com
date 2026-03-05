"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

type Transaction = {
  id: string; amount: number; type: string; note: string | null; created_at: string;
  profiles: { id: string; full_name: string; phone: string } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function PayoutsPage() {
  const [items, setItems]           = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);

  const fetchItems = useCallback(async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "20", type: "recharge" });
    try {
      const res  = await fetch(`/api/admin/customers/wallet-transactions?${params}`);
      const json = await res.json();
      setItems(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchItems(); }, []); // eslint-disable-line

  const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
    recharge: { bg: "#d1fae5", color: "#059669" },
    debit:    { bg: "#fee2e2", color: "#dc2626" },
    refund:   { bg: "#e0e7ff", color: "#4338ca" },
    bonus:    { bg: "#fef3c7", color: "#d97706" },
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-800">Payouts / Wallet Transactions</span>
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
            <span className="text-4xl">💳</span><p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Customer","Amount","Type","Note","Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const c = TYPE_BADGE[item.type] ?? { bg: "#f3f4f6", color: "#6b7280" };
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{item.profiles?.full_name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">${Number(item.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                          style={{ background: c.bg, color: c.color }}>{item.type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{item.note || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Page {page} of {pagination.pages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => { const p = page - 1; setPage(p); fetchItems(p); }} disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              <button onClick={() => { const p = page + 1; setPage(p); fetchItems(p); }} disabled={page >= pagination.pages}
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
