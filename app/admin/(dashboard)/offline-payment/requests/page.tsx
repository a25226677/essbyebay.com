"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPagination } from "@/components/admin/pagination";
import { CreditCard, CheckCircle, XCircle } from "lucide-react";

type PaymentRequest = {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function OfflinePaymentRequestsPage() {
  const [items, setItems] = useState<PaymentRequest[]>([]);
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

  const updateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/admin/withdrawals`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: newStatus }) });
    load(pagination.page);
  };

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    paid: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Offline Payment Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review and approve offline payment submissions</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400"><CreditCard className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No payment requests</p></td></tr>
              ) : items.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{req.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.profiles?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold">${Number(req.amount).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{req.payment_method || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{req.notes || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[req.status] || "bg-gray-100 text-gray-600"}`}>{req.status}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    {req.status === "pending" && (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => updateStatus(req.id, "approved")} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Approve"><CheckCircle className="size-4" /></button>
                        <button onClick={() => updateStatus(req.id, "rejected")} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Reject"><XCircle className="size-4" /></button>
                      </div>
                    )}
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
