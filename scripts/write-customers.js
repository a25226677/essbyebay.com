const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..');

// ── CUSTOMERS LIST PAGE ──────────────────────────────────────────
const customersPage = `"use client";

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
      const res  = await fetch(\`/api/admin/users?\${params}\`);
      const json = await res.json();
      setCustomers(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, []); // eslint-disable-line

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
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
      if (!confirm(\`Delete \${selected.size} customer(s)?\`)) return;
      await Promise.all([...selected].map((id) => fetch(\`/api/admin/users/\${id}\`, { method: "DELETE" })));
      setSelected(new Set()); fetchCustomers();
    } else if (bulkAction === "activate" || bulkAction === "deactivate") {
      const is_active = bulkAction === "activate";
      await Promise.all([...selected].map((id) =>
        fetch(\`/api/admin/users/\${id}\`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active }) })
      ));
      setSelected(new Set()); fetchCustomers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customer? This cannot be undone.")) return;
    await fetch(\`/api/admin/users/\${id}\`, { method: "DELETE" });
    fetchCustomers();
  };

  const handleBan = async (c: Customer) => {
    const is_active = !c.is_active;
    await fetch(\`/api/admin/users/\${c.id}\`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active }),
    });
    fetchCustomers();
    showToast(is_active ? "Customer activated" : "Customer banned");
  };

  const handleCreditSave = async (customer: Customer) => {
    const val = parseInt(creditEdits[customer.id] ?? String(customer.credit_score), 10);
    if (isNaN(val)) return;
    await fetch(\`/api/admin/users/\${customer.id}\`, {
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
    const res = await fetch(\`/api/admin/users/\${rechargeCustomer.id}\`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recharge_amount: amt }),
    });
    setRechargeLoading(false);
    if (res.ok) { showToast(\`\$\${amt.toFixed(2)} added to wallet\`); setRechargeCustomer(null); setRechargeAmt(""); fetchCustomers(); }
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
      showToast(\`\${json.created} virtual customers created!\`);
      setShowVirtualModal(false);
      fetchCustomers();
    } else {
      showToast(json.error || "Failed to create virtual customers", false);
    }
  };

  const togglePwdVis = (id: string) => {
    setShowPwdIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={\`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white transition-all \${toast.ok ? "bg-green-500" : "bg-red-500"}\`}>
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
            <RefreshCw className={\`size-3.5 text-gray-500 \${loading ? "animate-spin" : ""}\`} />
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
                  <tr key={c.id} className={\`hover:bg-gray-50/60 transition-colors \${!c.is_active ? "opacity-60" : ""}\`}>
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
                      \${Number(c.wallet_balance ?? 0).toFixed(2)}
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
                        <button onClick={() => router.push(\`/admin/customers/\${c.id}\`)}
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
                    className={\`w-7 h-7 text-xs rounded-lg font-medium \${p === page ? "bg-orange-500 text-white" : "hover:bg-gray-100 text-gray-600"}\`}>{p}</button>
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
                  <p className="text-xs text-gray-500">Current balance: <span className="font-semibold text-emerald-600">\${Number(rechargeCustomer.wallet_balance).toFixed(2)}</span></p>
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
`;

fs.writeFileSync(path.join(base, 'app/admin/(dashboard)/customers/page.tsx'), customersPage, 'utf8');
console.log('Written: customers/page.tsx');


// ── CUSTOMER DETAIL / EDIT PAGE ──────────────────────────────────
const customerDetailPage = `"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Save, User, Phone, Mail, MapPin, ShoppingBag, Star, Wallet, AlertCircle } from "lucide-react";

type Address = { id: string; label: string | null; full_name: string; phone: string; line_1: string; city: string; state: string; postal_code: string; country: string };
type Profile = {
  id: string; full_name: string | null; email: string | null; phone: string | null;
  avatar_url: string | null; role: string; is_active: boolean; is_virtual: boolean;
  disable_login: boolean; wallet_balance: number; credit_score: number; package: string | null;
  created_at: string; addresses: Address[]; orderCount: number; totalSpent: number;
  reviewCount: number;
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ text: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    full_name: "", phone: "", credit_score: 100, package: "", wallet_balance: 0,
    is_active: true, disable_login: false,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(\`/api/admin/users/\${id}\`)
      .then((r) => r.json())
      .then((json) => {
        const p: Profile = json.item;
        if (p) {
          setProfile(p);
          setForm({
            full_name:    p.full_name || "",
            phone:        p.phone || "",
            credit_score: p.credit_score ?? 100,
            package:      p.package || "",
            wallet_balance: p.wallet_balance ?? 0,
            is_active:    p.is_active,
            disable_login: p.disable_login,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    const res = await fetch(\`/api/admin/users/\${id}\`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name:    form.full_name,
        phone:        form.phone,
        credit_score: Number(form.credit_score),
        package:      form.package || null,
        wallet_balance: Number(form.wallet_balance),
        is_active:    form.is_active,
        disable_login: form.disable_login,
      }),
    });
    setSaving(false);
    if (res.ok) { setMsg({ text: "Saved successfully!", ok: true }); setTimeout(() => setMsg(null), 3000); }
    else setMsg({ text: "Error saving changes.", ok: false });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
      <RefreshCw className="size-6 animate-spin" /> <span>Loading…</span>
    </div>
  );

  if (!profile) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
      <AlertCircle className="size-10 opacity-30" />
      <p>Customer not found</p>
      <button onClick={() => router.back()} className="text-orange-500 hover:underline text-sm">Go back</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="size-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Customer</h1>
            <p className="text-xs text-gray-500">ID: {profile.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className={\`text-xs font-semibold \${msg.ok ? "text-green-500" : "text-red-500"}\`}>{msg.text}</span>}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl transition-colors">
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Stats */}
        <div className="space-y-4">
          {/* Avatar card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-600">
              {(profile.full_name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{profile.full_name || "—"}</p>
              <p className="text-xs text-gray-500 mt-0.5">{profile.email || "—"}</p>
              {profile.is_virtual && <span className="mt-1 inline-block text-[11px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold">Virtual</span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
              <span className={\`px-2.5 py-1 rounded-full font-semibold \${profile.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}\`}>
                {profile.is_active ? "Active" : "Banned"}
              </span>
              <span className="capitalize bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">{profile.role}</span>
            </div>
          </div>

          {/* Stats cards */}
          {[
            { icon: ShoppingBag, label: "Total Orders", value: profile.orderCount ?? 0, color: "#f97316" },
            { icon: Wallet,      label: "Total Spent",  value: \`\$\${Number(profile.totalSpent ?? 0).toFixed(2)}\`, color: "#059669" },
            { icon: Star,        label: "Reviews",      value: profile.reviewCount ?? 0, color: "#f59e0b" },
            { icon: Wallet,      label: "Wallet",       value: \`\$\${Number(profile.wallet_balance ?? 0).toFixed(2)}\`, color: "#0ea5e9" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "20" }}>
                <Icon className="size-4.5" style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-base font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Edit form + addresses */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2.5">Profile Info</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                  <input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                  <input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email (read-only)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                  <input type="text" value={profile.email || ""} readOnly
                    className="w-full border border-gray-100 rounded-xl pl-8 pr-3 py-2.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Credit Score</label>
                <input type="number" value={form.credit_score} onChange={(e) => setForm((f) => ({ ...f, credit_score: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Package</label>
                <select value={form.package} onChange={(e) => setForm((f) => ({ ...f, package: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 cursor-pointer">
                  <option value="">None</option>
                  <option value="Basic">Basic</option>
                  <option value="Premium">Premium</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Wallet Balance (USD)</label>
                <input type="number" min="0" step="0.01" value={form.wallet_balance}
                  onChange={(e) => setForm((f) => ({ ...f, wallet_balance: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300 text-orange-500 w-4 h-4" />
                <span className="text-sm text-gray-700">Account Active</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.disable_login} onChange={(e) => setForm((f) => ({ ...f, disable_login: e.target.checked }))}
                  className="rounded border-gray-300 text-orange-500 w-4 h-4" />
                <span className="text-sm text-gray-700">Disable Login</span>
              </label>
            </div>
          </div>

          {/* Addresses */}
          {profile.addresses.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2.5 mb-3">Addresses</h3>
              <div className="space-y-3">
                {profile.addresses.map((addr) => (
                  <div key={addr.id} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                    <MapPin className="size-4 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{addr.label || "Address"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {addr.line_1}, {addr.city}, {addr.state} {addr.postal_code}, {addr.country}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`;

fs.mkdirSync(path.join(base, 'app/admin/(dashboard)/customers/[id]'), { recursive: true });
fs.writeFileSync(path.join(base, 'app/admin/(dashboard)/customers/[id]/page.tsx'), customerDetailPage, 'utf8');
console.log('Written: customers/[id]/page.tsx');


// ── PAYOUT REQUESTS PAGE ─────────────────────────────────────────
const payoutRequestsPage = `"use client";
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
      const res  = await fetch(\`/api/admin/customers/payout-requests?\${params}\`);
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
            <RefreshCw className={\`size-3.5 text-gray-500 \${loading ? "animate-spin" : ""}\`} />
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
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">\${Number(item.amount).toFixed(2)}</td>
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
`;

fs.mkdirSync(path.join(base, 'app/admin/(dashboard)/customers/payout-requests'), { recursive: true });
fs.writeFileSync(path.join(base, 'app/admin/(dashboard)/customers/payout-requests/page.tsx'), payoutRequestsPage, 'utf8');
console.log('Written: customers/payout-requests/page.tsx');


// ── PAYOUTS PAGE ─────────────────────────────────────────────────
const payoutsPage = `"use client";
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
      const res  = await fetch(\`/api/admin/customers/wallet-transactions?\${params}\`);
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
            <RefreshCw className={\`size-3.5 text-gray-500 \${loading ? "animate-spin" : ""}\`} />
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
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">\${Number(item.amount).toFixed(2)}</td>
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
`;

fs.mkdirSync(path.join(base, 'app/admin/(dashboard)/customers/payouts'), { recursive: true });
fs.writeFileSync(path.join(base, 'app/admin/(dashboard)/customers/payouts/page.tsx'), payoutsPage, 'utf8');
console.log('Written: customers/payouts/page.tsx');

console.log('ALL DONE');
