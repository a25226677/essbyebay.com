"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPagination } from "@/components/admin/pagination";
import { DollarSign } from "lucide-react";

type Withdrawal = {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  profiles: { full_name: string } | null;
  shops: { name: string } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function CommissionsPage() {
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
    try {
      const res = await fetch(`/api/admin/withdrawals?${params}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch { setItems([]); } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(1); }, [load]);

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    paid: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Salesman Commissions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track commission payouts and withdrawals</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Salesman</th>
                <th className="px-4 py-3 text-left">Shop</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400"><DollarSign className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No commission records</p></td></tr>
              ) : items.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{w.profiles?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{w.shops?.name || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(w.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{w.payment_method || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[w.status] || "bg-gray-100 text-gray-600"}`}>{w.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(w.created_at).toLocaleDateString()}</td>
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
