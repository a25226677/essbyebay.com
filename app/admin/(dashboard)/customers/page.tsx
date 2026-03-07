"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw, ChevronLeft, ChevronRight, Eye, EyeOff,
  Pencil, Trash2, X, Plus, DollarSign,
} from "lucide-react";

type Customer = {
  id: string; full_name: string | null; email: string | null;
  phone: string | null; avatar_url: string | null;
  is_active: boolean; is_virtual: boolean; disable_login: boolean;
  wallet_balance: number; credit_score: number;
  package: string | null; created_at: string;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function CustomersListPage() {
  const router = useRouter();
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [showPwdIds, setShowPwdIds] = useState<Set<string>>(new Set());
  const [creditEdits, setCreditEdits] = useState<Record<string, string>>({});

  // Virtual customers modal
  const [showVirtualModal, setShowVirtualModal] = useState(false);
  const [virtualForm, setVirtualForm] = useState({ quantity: "10", initial_balance: "0.00", disable_login: false });
  const [virtualLoading, setVirtualLoading] = useState(false);

  // Recharge modal
  const [rechargeCustomer, setRechargeCustomer] = useState<Customer | null>(null);
  const [rechargeAmt, setRechargeAmt] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const searchRef = useRef<HTMLInputElement>(null);

  const fetchCustomers = useCallback(async (overrides?: { search?: string; page?: number }) => {
    setLoading(true);
    const s = overrides?.search ?? search;
    const p = overrides?.page ?? page;
    const params = new URLSearchParams({ role: "customer", page: String(p), limit: "20" });
    if (s) params.set("search", s);
    try {
      const res  = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();
      setCustomers(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, []); // eslint-disable-line

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === customers.length) setSelected(new Set());
    else setSelected(new Set(customers.map((c) => c.id)));
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { setPage(1); fetchCustomers({ search, page: 1 }); }
  };

  const handleBulkApply = async () => {
    if (!bulkAction || selected.size === 0) return;
    if (bulkAction === "delete") {
      if (!confirm(`Delete ${selected.size} customer(s)?`)) return;
      await Promise.all([...selected].map((id) => fetch(`/api/admin/users/${id}`, { method: "DELETE" })));
      setSelected(new Set()); fetchCustomers();
    } else if (bulkAction === "activate" || bulkAction === "deactivate") {
      const is_active = bulkAction === "activate";
      await Promise.all([...selected].map((id) =>
        fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active }) })
      ));
      setSelected(new Set()); fetchCustomers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    fetchCustomers();
  };

  const handleBan = async (c: Customer) => {
    const is_active = !c.is_active;
    await fetch(`/api/admin/users/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active }),
    });
    fetchCustomers();
    showToast(is_active ? "Customer activated" : "Customer banned");
  };

  const handleCreditSave = async (customer: Customer) => {
    const val = parseInt(creditEdits[customer.id] ?? String(customer.credit_score), 10);
    if (isNaN(val)) return;
    await fetch(`/api/admin/users/${customer.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credit_score: val }),
    });
    showToast("Credit score updated");
    fetchCustomers();
  };

  const handleRecharge = async () => {
    if (!rechargeCustomer) return;
    const amt = parseFloat(rechargeAmt);
    if (isNaN(amt) || amt <= 0) { showToast("Enter a valid amount", false); return; }
    setRechargeLoading(true);
    const res = await fetch(`/api/admin/users/${rechargeCustomer.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recharge_amount: amt }),
    });
    setRechargeLoading(false);
    if (res.ok) { showToast(`$${amt.toFixed(2)} added to wallet`); setRechargeCustomer(null); setRechargeAmt(""); fetchCustomers(); }
    else showToast("Recharge failed", false);
  };

  const handleCreateVirtual = async () => {
    setVirtualLoading(true);
    const res = await fetch("/api/admin/customers/virtual", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity:        parseInt(virtualForm.quantity, 10),
        initial_balance: parseFloat(virtualForm.initial_balance || "0"),
        disable_login:   virtualForm.disable_login,
      }),
    });
    const json = await res.json();
    setVirtualLoading(false);
    if (json.created) {
      const hasErrors = Array.isArray(json.errors) && json.errors.length > 0;
      showToast(
        hasErrors
          ? `${json.created} virtual customers created (some rows failed)`
          : `${json.created} virtual customers created!`,
        !hasErrors,
      );

      if (hasErrors) {
        // Surface the first backend error for faster troubleshooting.
        showToast(String(json.errors[0]), false);
      }

      setShowVirtualModal(false);
      fetchCustomers();
    } else {
      showToast(json.error || "Failed to create virtual customers", false);
    }
  };

  const togglePwdVis = (id: string) => {
    setShowPwdIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all ${toast.ok ? "bg-green-500" : "bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Customers</h1>
          <p className="text-xs text-gray-500 mt-0.5">{pagination.total.toLocaleString()} total customers</p>
        </div>
        <button
          onClick={() => setShowVirtualModal(true)}
          className="flex items-center gap-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="size-4" />
          Create Virtual Customers
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-800 shrink-0">Customers</span>

          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer min-w-[130px]">
            <option value="">Bulk Action</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="delete">Delete</option>
          </select>

          {bulkAction && selected.size > 0 && (
            <button onClick={handleBulkApply}
              className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors">
              Apply ({selected.size})
            </button>
          )}

          <input ref={searchRef} type="text" value={search}
            onChange={(e) => setSearch(e.target.value)} onKeyDown={handleSearchKey}
            placeholder="Type email or name & Enter"
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 min-w-[240px] flex-1" />

          <button onClick={() => fetchCustomers()} title="Refresh"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`size-3.5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <RefreshCw className="size-5 animate-spin" /><span className="text-sm">Loading…</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <span className="text-4xl">👥</span><p className="text-sm">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selected.size === customers.length && customers.length > 0}
                      onChange={toggleAll} className="rounded border-gray-300 text-orange-500 cursor-pointer" />
                  </th>
                  {["Name","Email Address","Password","Phone","Credit Score","Package","Wallet Balance","Options"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr key={c.id} className={`hover:bg-gray-50/60 transition-colors ${!c.is_active ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                        className="rounded border-gray-300 text-orange-500 cursor-pointer" />
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                          {(c.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800 leading-tight">
                            {c.full_name || "—"}
                            {c.is_virtual && <span className="ml-1.5 text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-medium">Virtual</span>}
                          </p>
                          {!c.is_active && <span className="text-[10px] text-red-500 font-semibold">Banned</span>}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-xs text-gray-600">{c.email || "—"}</td>

                    {/* Password masked */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500 tracking-widest">
                          {showPwdIds.has(c.id) ? (c.is_virtual ? "Virtual@Pass" : "•••••••••") : "••••••••"}
                        </span>
                        <button onClick={() => togglePwdVis(c.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors">
                          {showPwdIds.has(c.id) ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" style={{ color: "#f97316" }} />}
                        </button>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-xs text-gray-600">{c.phone || "—"}</td>

                    {/* Credit Score */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={creditEdits[c.id] ?? String(c.credit_score ?? 100)}
                          onChange={(e) => setCreditEdits((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          onBlur={() => handleCreditSave(c)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleCreditSave(c); }}
                          className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-orange-400 bg-gray-50"
                        />
                      </div>
                    </td>

                    {/* Package */}
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c.package ? (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-medium">{c.package}</span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>

                    {/* Wallet Balance */}
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-600">
                      ${Number(c.wallet_balance ?? 0).toFixed(2)}
                    </td>

                    {/* Options */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* Recharge */}
                        <button onClick={() => { setRechargeCustomer(c); setRechargeAmt(""); }}
                          className="text-[11px] font-semibold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          Recharge
                        </button>
                        {/* Edit */}
                        <button onClick={() => router.push(`/admin/customers/${c.id}`)}
                          title="Edit" className="p-1.5 rounded-lg" style={{ background: "#fef3c7" }}>
                          <Pencil className="size-3.5" style={{ color: "#d97706" }} />
                        </button>
                        {/* Ban/Activate */}
                        <button onClick={() => handleBan(c)}
                          title={c.is_active ? "Ban customer" : "Activate customer"}
                          className="p-1.5 rounded-lg" style={{ background: c.is_active ? "#fce7f3" : "#d1fae5" }}>
                          <X className="size-3.5" style={{ color: c.is_active ? "#ec4899" : "#059669" }} />
                        </button>
                        {/* Delete */}
                        <button onClick={() => handleDelete(c.id)}
                          title="Delete" className="p-1.5 rounded-lg" style={{ background: "#fee2e2" }}>
                          <Trash2 className="size-3.5" style={{ color: "#dc2626" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => { const p = page - 1; setPage(p); fetchCustomers({ page: p }); }} disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return (
                  <button key={p} onClick={() => { setPage(p); fetchCustomers({ page: p }); }}
                    className={`w-7 h-7 text-xs rounded-lg font-medium ${p === page ? "bg-orange-500 text-white" : "hover:bg-gray-100 text-gray-600"}`}>{p}</button>
                );
              })}
              <button onClick={() => { const p = page + 1; setPage(p); fetchCustomers({ page: p }); }} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Virtual Customers Modal */}
      {showVirtualModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Create Virtual Customers</h2>
              <button onClick={() => setShowVirtualModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="size-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 leading-relaxed">
                N.B: You can create virtual customers here, with a maximum of 100 people
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Quantity</label>
                <input type="number" min="1" max="100" value={virtualForm.quantity}
                  onChange={(e) => setVirtualForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Initial Balance</label>
                <input type="number" min="0" step="0.01" value={virtualForm.initial_balance}
                  onChange={(e) => setVirtualForm((f) => ({ ...f, initial_balance: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
              </div>
              <div className="flex items-center gap-2.5">
                <input type="checkbox" id="disableLogin" checked={virtualForm.disable_login}
                  onChange={(e) => setVirtualForm((f) => ({ ...f, disable_login: e.target.checked }))}
                  className="rounded border-gray-300 text-orange-500 focus:ring-orange-400 cursor-pointer w-4 h-4" />
                <label htmlFor="disableLogin" className="text-sm text-gray-700 cursor-pointer select-none">Disable Log in</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowVirtualModal(false)}
                className="text-sm font-semibold text-gray-600 hover:text-gray-800 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreateVirtual} disabled={virtualLoading}
                className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2 rounded-xl transition-colors flex items-center gap-2">
                {virtualLoading ? <RefreshCw className="size-3.5 animate-spin" /> : null}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {rechargeCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Recharge Wallet</h2>
              <button onClick={() => setRechargeCustomer(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100"><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">
                  {(rechargeCustomer.full_name || "?").charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{rechargeCustomer.full_name}</p>
                  <p className="text-xs text-gray-500">Current balance: <span className="font-semibold text-emerald-600">${Number(rechargeCustomer.wallet_balance).toFixed(2)}</span></p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input type="number" min="0.01" step="0.01" value={rechargeAmt}
                    onChange={(e) => setRechargeAmt(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setRechargeCustomer(null)}
                className="text-sm font-semibold text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRecharge} disabled={rechargeLoading}
                className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-5 py-2 rounded-xl flex items-center gap-2">
                {rechargeLoading ? <RefreshCw className="size-3.5 animate-spin" /> : <DollarSign className="size-3.5" />}
                Recharge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
