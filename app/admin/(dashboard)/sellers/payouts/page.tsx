"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, ChevronLeft, ChevronRight, Plus, X, DollarSign } from "lucide-react";

type Payment = {
  id: string; amount: number; payment_details: string | null; trx_id: string | null;
  created_at: string; shop_name: string | null; seller_id: string;
  profiles: { id: string; full_name: string | null; phone: string | null } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

function SellerPayoutsInner() {
  const searchParams = useSearchParams();
  const preselectedSeller = searchParams.get("seller_id") || "";

  const [items, setItems]           = useState<Payment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);

  // Add payment modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ seller_id: "", amount: "", payment_details: "", trx_id: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [sellers, setSellers] = useState<{ id: string; full_name: string | null }[]>([]);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch("/api/admin/users?role=seller&limit=200")
      .then(r => r.json()).then(j => setSellers(j.items || []));
  }, []);

  const fetchItems = useCallback(async (p = page) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (preselectedSeller) params.set("seller_id", preselectedSeller);
    try {
      const res  = await fetch(`/api/admin/sellers/payments?${params}`);
      const json = await res.json();
      setItems(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, preselectedSeller]);

  useEffect(() => { fetchItems(); }, []); // eslint-disable-line

  const handleAdd = async () => {
    const amt = parseFloat(addForm.amount);
    if (!addForm.seller_id || isNaN(amt)) { showToast("Fill seller and amount", false); return; }
    setAddLoading(true);
    const res = await fetch("/api/admin/sellers/payments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller_id: addForm.seller_id, amount: amt,
        payment_details: addForm.payment_details || "Bank payment",
        trx_id: addForm.trx_id || null,
      }),
    });
    setAddLoading(false);
    if (res.ok) { showToast("Payment recorded"); setShowAdd(false); setAddForm({ seller_id: "", amount: "", payment_details: "", trx_id: "" }); fetchItems(); }
    else showToast("Failed to record payment", false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment record?")) return;
    await fetch("/api/admin/sellers/payments", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    fetchItems(); showToast("Deleted");
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
        <h1 className="text-xl font-bold text-gray-900">Seller Payments</h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl">
          <Plus className="size-4" />Add Payment
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <RefreshCw className="size-5 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <span className="text-4xl">💳</span><p className="text-sm">No payments recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#","Date","Seller","Amount","Payment Details",""].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-xs text-gray-400">{offset + idx + 1}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-gray-800">{item.profiles?.full_name || "—"}</p>
                      {item.shop_name && <p className="text-[11px] text-gray-500">({item.shop_name})</p>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900">${Number(item.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {item.payment_details || "—"}
                      {item.trx_id && <span className="ml-1 text-gray-400">(TRX ID: {item.trx_id})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100">
                        <X className="size-3.5 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* Add Payment Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Add Seller Payment</h2>
              <button onClick={() => setShowAdd(false)}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Seller</label>
                <select value={addForm.seller_id} onChange={e => setAddForm(f => ({ ...f, seller_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 cursor-pointer">
                  <option value="">Select seller…</option>
                  {sellers.map(s => <option key={s.id} value={s.id}>{s.full_name || s.id.slice(0,8)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (USD)</label>
                <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input type="number" min="0.01" step="0.01" value={addForm.amount}
                    onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00" className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Details</label>
                <input type="text" value={addForm.payment_details} onChange={e => setAddForm(f => ({ ...f, payment_details: e.target.value }))}
                  placeholder="e.g. Bank payment" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">TRX ID (optional)</label>
                <input type="text" value={addForm.trx_id} onChange={e => setAddForm(f => ({ ...f, trx_id: e.target.value }))}
                  placeholder="Transaction ID" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowAdd(false)} className="text-sm text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={addLoading}
                className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2 rounded-xl">
                {addLoading ? "Saving…" : "Save Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellerPayoutsPage() {
  return <Suspense fallback={<div className="flex items-center justify-center py-24 text-gray-400 gap-3"><RefreshCw className="size-5 animate-spin" /><span>Loading…</span></div>}><SellerPayoutsInner /></Suspense>;
}
