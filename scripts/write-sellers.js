const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..');

// ── SELLER PAYMENTS API ───────────────────────────────────────────
const sellerPaymentsApi = `import { getAdminContext } from "@/lib/supabase/admin-api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const sp       = request.nextUrl.searchParams;
  const sellerId = sp.get("seller_id") || "";
  const page  = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") || "20", 10));
  const offset = (page - 1) * limit;

  let query = db
    .from("seller_payments")
    .select(
      "id, amount, payment_details, trx_id, created_at, seller_id, profiles!seller_payments_seller_id_fkey(id, full_name, phone)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (sellerId) query = query.eq("seller_id", sellerId);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach shop names
  const items = data || [];
  const enriched = await Promise.all(
    items.map(async (p: Record<string, unknown>) => {
      const sid = (p.profiles as Record<string, unknown> | null)?.id as string | null;
      let shopName: string | null = null;
      if (sid) {
        const { data: shop } = await db.from("shops").select("name").eq("owner_id", sid).maybeSingle();
        shopName = shop?.name || null;
      }
      return { ...p, shop_name: shopName };
    })
  );

  return NextResponse.json({
    items: enriched,
    pagination: { page, limit, total: count || 0, pages: Math.max(1, Math.ceil((count || 0) / limit)) },
  });
}

export async function POST(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db, userId } = context;

  const body = await request.json();
  const { seller_id, amount, payment_details, trx_id } = body;
  if (!seller_id || !amount) return NextResponse.json({ error: "seller_id and amount required" }, { status: 400 });

  const { data, error } = await db.from("seller_payments").insert({
    seller_id, amount, payment_details: payment_details || null, trx_id: trx_id || null, admin_id: userId,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}

export async function DELETE(request: NextRequest) {
  const context = await getAdminContext();
  if (context instanceof NextResponse) return context;
  const { db } = context;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await db.from("seller_payments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
`;

fs.mkdirSync(path.join(base, 'app/api/admin/sellers/payments'), { recursive: true });
fs.writeFileSync(path.join(base, 'app/api/admin/sellers/payments/route.ts'), sellerPaymentsApi, 'utf8');
console.log('Written: api/admin/sellers/payments/route.ts');


// ── SELLERS LIST PAGE (full rewrite) ────────────────────────────
const sellersListPage = `"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw, ChevronLeft, ChevronRight, Eye, EyeOff, Trash2, X,
  Plus, DollarSign, MoreVertical, MessageSquare, Check, Ban
} from "lucide-react";

type Seller = {
  id: string; full_name: string | null; email: string | null; phone: string | null;
  avatar_url: string | null; is_active: boolean; is_virtual: boolean; seller_approved: boolean;
  wallet_balance: number; credit_score: number; package: string | null; guarantee_money: number;
  pending_balance: number; seller_views: number; comment_permission: boolean; home_display: boolean;
  verification_info: string | null; invitation_code: string | null; salesman_id: string | null;
  identity_card_url: string | null; total_recharge: number; total_withdrawn: number;
  created_at: string; shops: { name: string; product_count: number }[];
};
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function SellersListPage() {
  const router = useRouter();
  const [sellers, setSellers]       = useState<Seller[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [search, setSearch]         = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [page, setPage]             = useState(1);

  // Inline credit editing
  const [creditEdits, setCreditEdits] = useState<Record<string, string>>({});

  // Dropdown menu per row
  const [openMenu, setOpenMenu]     = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [guaranteeModal, setGuaranteeModal] = useState<Seller | null>(null);
  const [rechargeModal,  setRechargeModal]  = useState<Seller | null>(null);
  const [messageModal,   setMessageModal]   = useState<Seller | null>(null);
  const [balanceModal,   setBalanceModal]   = useState<Seller | null>(null);
  const [packageModal,   setPackageModal]   = useState<Seller | null>(null);
  const [guaranteeAmt, setGuaranteeAmt]     = useState("");
  const [rechargeAmt,  setRechargeAmt]      = useState("");
  const [messageText,  setMessageText]      = useState("");
  const [balanceAmt,   setBalanceAmt]       = useState("");
  const [packageVal,   setPackageVal]       = useState("");
  const [actionLoading, setActionLoading]   = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSellers = useCallback(async (overrides?: { search?: string; date?: string; approval?: string; page?: number }) => {
    setLoading(true);
    const s  = overrides?.search   ?? search;
    const dt = overrides?.date     ?? dateFilter;
    const ap = overrides?.approval ?? approvalFilter;
    const p  = overrides?.page     ?? page;
    const params = new URLSearchParams({ role: "seller", page: String(p), limit: "20" });
    if (s)  params.set("search", s);
    if (dt) params.set("from", dt);
    if (ap !== "") params.set("seller_approved", ap);
    try {
      const res  = await fetch(\`/api/admin/users?\${params}\`);
      const json = await res.json();
      setSellers(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, dateFilter, approvalFilter, page]);

  useEffect(() => { fetchSellers(); }, []); // eslint-disable-line

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    if (selected.size === sellers.length) setSelected(new Set());
    else setSelected(new Set(sellers.map(s => s.id)));
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(\`/api/admin/users/\${id}\`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return res.ok;
  };

  const handleBulkApply = async () => {
    if (!bulkAction || selected.size === 0) return;
    setActionLoading(true);
    if (bulkAction === "delete") {
      if (!confirm(\`Delete \${selected.size} seller(s)?\`)) { setActionLoading(false); return; }
      await Promise.all([...selected].map(id => fetch(\`/api/admin/users/\${id}\`, { method: "DELETE" })));
      setSelected(new Set());
    } else if (bulkAction === "activate" || bulkAction === "deactivate") {
      await Promise.all([...selected].map(id => patch(id, { is_active: bulkAction === "activate" })));
      setSelected(new Set());
    } else if (bulkAction === "approve") {
      await Promise.all([...selected].map(id => patch(id, { seller_approved: true })));
      setSelected(new Set());
    }
    fetchSellers();
    setActionLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this seller permanently?")) return;
    await fetch(\`/api/admin/users/\${id}\`, { method: "DELETE" });
    fetchSellers(); showToast("Seller deleted");
  };

  const handleToggle = async (seller: Seller, field: string, val: boolean) => {
    await patch(seller.id, { [field]: val });
    fetchSellers(); showToast(\`Updated \${field.replace(/_/g, " ")}\`);
  };

  const handleCreditSave = async (seller: Seller) => {
    const val = parseInt(creditEdits[seller.id] ?? String(seller.credit_score), 10);
    if (isNaN(val)) return;
    await patch(seller.id, { credit_score: val });
    showToast("Credit score updated"); fetchSellers();
  };

  const handleGuarantee = async () => {
    if (!guaranteeModal) return;
    const amt = parseFloat(guaranteeAmt);
    if (isNaN(amt)) return;
    setActionLoading(true);
    await patch(guaranteeModal.id, { guarantee_money: amt });
    setActionLoading(false); showToast("Guarantee money updated");
    setGuaranteeModal(null); setGuaranteeAmt(""); fetchSellers();
  };

  const handleRecharge = async () => {
    if (!rechargeModal) return;
    const amt = parseFloat(rechargeAmt);
    if (isNaN(amt) || amt <= 0) { showToast("Enter valid amount", false); return; }
    setActionLoading(true);
    await patch(rechargeModal.id, { recharge_amount: amt, recharge_note: "Admin recharge" });
    // Also record as seller payment
    await fetch("/api/admin/sellers/payments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_id: rechargeModal.id, amount: amt, payment_details: "Pay From admin (TRX ID: ADM-" + Date.now() + ")", trx_id: "ADM-" + Date.now() }),
    });
    setActionLoading(false); showToast(\`\$\${amt.toFixed(2)} added to wallet\`);
    setRechargeModal(null); setRechargeAmt(""); fetchSellers();
  };

  const handleBalance = async () => {
    if (!balanceModal) return;
    const amt = parseFloat(balanceAmt);
    if (isNaN(amt)) return;
    setActionLoading(true);
    await patch(balanceModal.id, { wallet_balance: amt });
    setActionLoading(false); showToast("Balance updated");
    setBalanceModal(null); setBalanceAmt(""); fetchSellers();
  };

  const handlePackage = async () => {
    if (!packageModal) return;
    setActionLoading(true);
    await patch(packageModal.id, { package: packageVal || null });
    setActionLoading(false); showToast("Package updated");
    setPackageModal(null); setPackageVal(""); fetchSellers();
  };

  const handleMessage = async () => {
    if (!messageModal || !messageText.trim()) return;
    setActionLoading(true);
    // message functionality - using support/notification
    setActionLoading(false);
    showToast("Message feature coming soon");
    setMessageModal(null); setMessageText("");
  };

  const offset = (page - 1) * pagination.limit;

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
          <h1 className="text-xl font-bold text-gray-900">All Sellers</h1>
          <p className="text-xs text-gray-500 mt-0.5">{pagination.total.toLocaleString()} total sellers</p>
        </div>
        <button onClick={() => router.push("/admin/sellers/create")}
          className="flex items-center gap-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="size-4" /> Add Virtual Seller
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer min-w-[130px]">
            <option value="">Bulk Action</option>
            <option value="approve">Approve</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="delete">Delete</option>
          </select>
          {bulkAction && selected.size > 0 && (
            <button onClick={handleBulkApply} disabled={actionLoading}
              className="text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-3 py-2 rounded-lg font-semibold">
              Apply ({selected.size})
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 whitespace-nowrap">Filter by date</span>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400" />
          </div>

          <select value={approvalFilter} onChange={e => setApprovalFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer min-w-[160px]">
            <option value="">Filter by Approval</option>
            <option value="true">Approved</option>
            <option value="false">Not Approved</option>
          </select>

          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); fetchSellers({ search, page: 1 }); } }}
            placeholder="Type name or email & Enter"
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 min-w-[220px] flex-1" />

          <button onClick={() => { setPage(1); fetchSellers({ page: 1 }); }}
            className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg transition-colors shrink-0">
            Search
          </button>
          <button onClick={() => fetchSellers()} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
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
        ) : sellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
            <span className="text-4xl">🏪</span><p className="text-sm">No sellers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[2000px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-3 w-8">
                    <input type="checkbox" checked={selected.size === sellers.length && sellers.length > 0}
                      onChange={toggleAll} className="rounded border-gray-300 text-orange-500 cursor-pointer" />
                  </th>
                  {["Name","Phone","Email Address","Credit Score","Verification Info","Approval",
                    "Num. of Products","Pending Balance","Wallet Balance","Guarantee Money","Views",
                    "Comment Permission","Home Display","Total recharge","Total withdrawal amount",
                    "Recharge difference","Salesman","Invitation Code","Identity Cards","Options"]
                    .map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sellers.map((seller, idx) => {
                  const shopName = seller.shops?.[0]?.name || null;
                  const productCount = seller.shops?.[0]?.product_count ?? 0;
                  const rechargeDiff = Number(seller.total_recharge ?? 0) - Number(seller.total_withdrawn ?? 0);
                  return (
                    <tr key={seller.id} className={\`hover:bg-gray-50/60 transition-colors \${!seller.is_active ? "opacity-60" : ""}\`}>
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selected.has(seller.id)} onChange={() => toggleSelect(seller.id)}
                          className="rounded border-gray-300 text-orange-500 cursor-pointer" />
                      </td>

                      {/* Name */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                            {(shopName || seller.full_name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-xs leading-tight whitespace-nowrap">
                              {shopName || seller.full_name || "—"}
                            </p>
                            {!seller.is_active && <span className="text-[10px] text-red-500 font-semibold">Banned</span>}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{seller.phone || "—"}</td>

                      {/* Email */}
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap max-w-[180px] truncate">{seller.email || "—"}</td>

                      {/* Credit Score */}
                      <td className="px-3 py-3">
                        <input type="number"
                          value={creditEdits[seller.id] ?? String(seller.credit_score ?? 100)}
                          onChange={e => setCreditEdits(p => ({ ...p, [seller.id]: e.target.value }))}
                          onBlur={() => handleCreditSave(seller)}
                          onKeyDown={e => { if (e.key === "Enter") handleCreditSave(seller); }}
                          className="w-14 text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:border-orange-400 bg-gray-50" />
                      </td>

                      {/* Verification Info */}
                      <td className="px-3 py-3 text-gray-500 max-w-[120px] truncate">
                        {seller.verification_info || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Approval toggle */}
                      <td className="px-3 py-3">
                        <button onClick={() => handleToggle(seller, "seller_approved", !seller.seller_approved)}
                          className={\`w-9 h-5 rounded-full transition-colors relative \${seller.seller_approved ? "bg-emerald-500" : "bg-gray-200"}\`}>
                          <span className={\`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform \${seller.seller_approved ? "translate-x-4" : "translate-x-0.5"}\`} />
                        </button>
                      </td>

                      {/* Num Products */}
                      <td className="px-3 py-3 text-center font-semibold text-gray-700">{productCount}</td>

                      {/* Pending Balance */}
                      <td className="px-3 py-3 text-gray-700">\${Number(seller.pending_balance ?? 0).toFixed(2)}</td>

                      {/* Wallet Balance */}
                      <td className="px-3 py-3 font-semibold text-emerald-600">\${Number(seller.wallet_balance ?? 0).toFixed(2)}</td>

                      {/* Guarantee Money */}
                      <td className="px-3 py-3 text-gray-700">\${Number(seller.guarantee_money ?? 0).toFixed(2)}</td>

                      {/* Views */}
                      <td className="px-3 py-3 text-gray-600">
                        <div>
                          <div className="text-gray-400">base num: {seller.seller_views ?? 0}</div>
                          <div className="text-gray-400">inc num: 0</div>
                        </div>
                      </td>

                      {/* Comment Permission */}
                      <td className="px-3 py-3">
                        <button onClick={() => handleToggle(seller, "comment_permission", !seller.comment_permission)}
                          className={\`w-9 h-5 rounded-full transition-colors relative \${seller.comment_permission ? "bg-emerald-500" : "bg-gray-200"}\`}>
                          <span className={\`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform \${seller.comment_permission ? "translate-x-4" : "translate-x-0.5"}\`} />
                        </button>
                      </td>

                      {/* Home Display */}
                      <td className="px-3 py-3">
                        <button onClick={() => handleToggle(seller, "home_display", !seller.home_display)}
                          className={\`w-9 h-5 rounded-full transition-colors relative \${seller.home_display ? "bg-emerald-500" : "bg-gray-200"}\`}>
                          <span className={\`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform \${seller.home_display ? "translate-x-4" : "translate-x-0.5"}\`} />
                        </button>
                      </td>

                      {/* Total Recharge */}
                      <td className="px-3 py-3 text-gray-700">\${Number(seller.total_recharge ?? 0).toFixed(2)}</td>

                      {/* Total Withdrawn */}
                      <td className="px-3 py-3 text-gray-700">\${Number(seller.total_withdrawn ?? 0).toFixed(2)}</td>

                      {/* Recharge Difference */}
                      <td className={\`px-3 py-3 font-semibold \${rechargeDiff >= 0 ? "text-emerald-600" : "text-red-500"}\`}>
                        \${rechargeDiff.toFixed(2)}
                      </td>

                      {/* Salesman */}
                      <td className="px-3 py-3 text-gray-400">xxx</td>

                      {/* Invitation Code */}
                      <td className="px-3 py-3">
                        <span className="text-[11px] font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {seller.invitation_code || "xxx"}
                        </span>
                      </td>

                      {/* Identity Cards */}
                      <td className="px-3 py-3">
                        {seller.identity_card_url ? (
                          <img src={seller.identity_card_url} alt="ID" className="w-10 h-8 object-cover rounded border border-gray-200" />
                        ) : (
                          <div className="w-10 h-8 rounded border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300 text-[10px]">ID</div>
                        )}
                      </td>

                      {/* Options Dropdown */}
                      <td className="px-3 py-3">
                        <div className="relative" ref={openMenu === seller.id ? menuRef : undefined}>
                          <button onClick={() => setOpenMenu(openMenu === seller.id ? null : seller.id)}
                            className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200">
                            <MoreVertical className="size-3.5 text-orange-600" />
                          </button>
                          {openMenu === seller.id && (
                            <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 min-w-[170px]">
                              {[
                                { label: "Profile",         action: () => router.push(\`/admin/sellers/\${seller.id}\`) },
                                { label: "Go to Payment",   action: () => router.push(\`/admin/sellers/payout-requests?seller_id=\${seller.id}\`) },
                                { label: "Payment History", action: () => router.push(\`/admin/sellers/payouts?seller_id=\${seller.id}\`) },
                                { label: "Hold",            action: () => handleToggle(seller, "is_active", false) },
                                { label: seller.is_active ? "Ban this seller" : "Unban seller", action: () => handleToggle(seller, "is_active", !seller.is_active), danger: !seller.is_active ? false : true },
                                { label: "Delete",          action: () => { setOpenMenu(null); handleDelete(seller.id); }, danger: true },
                                { label: "Message Seller",  action: () => { setMessageModal(seller); setOpenMenu(null); } },
                                { label: "Guarantee Money", action: () => { setGuaranteeModal(seller); setGuaranteeAmt(String(seller.guarantee_money ?? 0)); setOpenMenu(null); } },
                                { label: "Set Package",     action: () => { setPackageModal(seller); setPackageVal(seller.package || ""); setOpenMenu(null); } },
                                { label: "Update Balance",  action: () => { setRechargeModal(seller); setRechargeAmt(""); setOpenMenu(null); } },
                              ].map(item => (
                                <button key={item.label} onClick={() => { item.action(); setOpenMenu(null); }}
                                  className={\`block w-full text-left px-4 py-2 text-xs \${(item as { danger?: boolean }).danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"} transition-colors\`}>
                                  {item.label}
                                </button>
                              ))}
                            </div>
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

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Showing {offset + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => { const p = page - 1; setPage(p); fetchSellers({ page: p }); }} disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="size-4 text-gray-600" />
              </button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return (
                  <button key={p} onClick={() => { setPage(p); fetchSellers({ page: p }); }}
                    className={\`w-7 h-7 text-xs rounded-lg font-medium \${p === page ? "bg-orange-500 text-white" : "hover:bg-gray-100 text-gray-600"}\`}>{p}</button>
                );
              })}
              <button onClick={() => { const p = page + 1; setPage(p); fetchSellers({ page: p }); }} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="size-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Guarantee Money Modal ── */}
      {guaranteeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Guarantee Money</h2>
              <button onClick={() => setGuaranteeModal(null)}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-gray-500">Seller: <span className="font-semibold text-gray-800">{guaranteeModal.full_name}</span></p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Amount (USD)</label>
                <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input type="number" min="0" step="0.01" value={guaranteeAmt} onChange={e => setGuaranteeAmt(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setGuaranteeModal(null)} className="text-sm text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={handleGuarantee} disabled={actionLoading} className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2 rounded-xl">
                {actionLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Update Balance (Recharge) Modal ── */}
      {rechargeModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Update Balance</h2>
              <button onClick={() => setRechargeModal(null)}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                <p><span className="font-semibold">{rechargeModal.full_name}</span></p>
                <p className="mt-1">Current wallet: <span className="font-bold text-emerald-600">\${Number(rechargeModal.wallet_balance).toFixed(2)}</span></p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Add Amount (USD)</label>
                <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <input type="number" min="0.01" step="0.01" value={rechargeAmt} onChange={e => setRechargeAmt(e.target.value)}
                    placeholder="0.00" className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setRechargeModal(null)} className="text-sm text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRecharge} disabled={actionLoading} className="text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-5 py-2 rounded-xl">
                {actionLoading ? "Saving…" : "Recharge"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Set Package Modal ── */}
      {packageModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Set Package</h2>
              <button onClick={() => setPackageModal(null)}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Package</label>
              <select value={packageVal} onChange={e => setPackageVal(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 cursor-pointer">
                <option value="">None</option>
                <option value="Basic">Basic</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setPackageModal(null)} className="text-sm text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={handlePackage} disabled={actionLoading} className="text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2 rounded-xl">
                {actionLoading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Message Seller Modal ── */}
      {messageModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Message Seller</h2>
              <button onClick={() => setMessageModal(null)}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-gray-500">To: <span className="font-semibold text-gray-800">{messageModal.full_name}</span></p>
              <textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows={4}
                placeholder="Write your message here…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-gray-50 resize-none" />
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setMessageModal(null)} className="text-sm text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={handleMessage} disabled={actionLoading} className="flex items-center gap-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-2 rounded-xl">
                <MessageSquare className="size-3.5" />{actionLoading ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(path.join(base, 'app/admin/(dashboard)/sellers/page.tsx'), sellersListPage, 'utf8');
console.log('Written: sellers/page.tsx');


// ── PAYOUT REQUESTS (WITHDRAW REQUESTS) PAGE ─────────────────────
fs.mkdirSync(path.join(base, 'app/admin/(dashboard)/sellers/payout-requests'), { recursive: true });

const payoutRequestsPage = `"use client";

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
      const res  = await fetch(\`/api/admin/withdrawals?\${params}\`);
      const json = await res.json();
      setItems(json.items || []);
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [statusFilter, page, preselectedSeller]);

  useEffect(() => { fetchItems(); }, []); // eslint-disable-line

  const handleAction = async (id: string, status: string) => {
    setActionId(id);
    const res = await fetch("/api/admin/withdrawals", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setActionId(null);
    if (res.ok) {
      showToast(status === "paid" ? "Marked as paid" : "Refused");
      fetchItems();
    } else showToast("Action failed", false);
  };

  const offset = (page - 1) * pagination.limit;

  return (
    <div className="space-y-4">
      {toast && (
        <div className={\`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white \${toast.ok ? "bg-green-500" : "bg-red-500"}\`}>
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
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">\${walletBal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-orange-600">\${Number(item.amount).toFixed(2)}</td>
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
                  className={\`w-7 h-7 text-xs rounded-lg font-medium \${p === page ? "bg-orange-500 text-white" : "hover:bg-gray-100 text-gray-600"}\`}>{p}</button>;
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
                ["Amount", \`\$\${Number(viewItem.amount).toFixed(2)}\`],
                ["Wallet Balance", \`\$\${Number(viewItem.profiles?.wallet_balance ?? 0).toFixed(2)}\`],
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
                  <button onClick={() => { handleAction(viewItem.id, "refused"); setViewItem(null); }}
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
    </div>
  );
}

export default function PayoutRequestsPage() {
  return <Suspense fallback={<div className="flex items-center justify-center py-24 text-gray-400 gap-3"><RefreshCw className="size-5 animate-spin" /><span>Loading…</span></div>}><PayoutRequestsInner /></Suspense>;
}
`;

fs.writeFileSync(path.join(base, 'app/admin/(dashboard)/sellers/payout-requests/page.tsx'), payoutRequestsPage, 'utf8');
console.log('Written: sellers/payout-requests/page.tsx');


// ── SELLER PAYOUTS (SELLER PAYMENTS) PAGE ────────────────────────
fs.mkdirSync(path.join(base, 'app/admin/(dashboard)/sellers/payouts'), { recursive: true });

const sellerPayoutsPage = `"use client";

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
      const res  = await fetch(\`/api/admin/sellers/payments?\${params}\`);
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
        <div className={\`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white \${toast.ok ? "bg-green-500" : "bg-red-500"}\`}>
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
                    <td className="px-4 py-3 text-xs font-bold text-gray-900">\${Number(item.amount).toFixed(2)}</td>
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
`;

fs.writeFileSync(path.join(base, 'app/admin/(dashboard)/sellers/payouts/page.tsx'), sellerPayoutsPage, 'utf8');
console.log('Written: sellers/payouts/page.tsx');

console.log('ALL DONE');
