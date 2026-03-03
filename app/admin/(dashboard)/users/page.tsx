"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  Search, RefreshCw, Users, ChevronLeft, ChevronRight, UserCheck, UserX,
  Eye, Send, Edit3, Trash2, Plus, X, Mail, Phone, Calendar, Shield,
  ShoppingBag, Store, Star
} from "lucide-react";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: "customer" | "seller" | "admin";
  is_active: boolean;
  created_at: string;
};

type UserDetail = UserRow & {
  addresses: { id: string; label: string | null; city: string; country: string; line_1: string }[];
  orderCount: number;
  totalSpent: number;
  reviewCount: number;
  shop: { id: string; name: string; is_verified: boolean; product_count: number } | null;
};

type Pagination = { page: number; limit: number; total: number; pages: number };
type ModalMode = null | "view" | "edit" | "create" | "email";

const roleBadge = (role: string) => {
  const styles: Record<string, string> = {
    admin: "bg-purple-50 text-purple-700",
    seller: "bg-amber-50 text-amber-700",
    customer: "bg-blue-50 text-blue-700",
  };
  return styles[role] || "bg-gray-50 text-gray-700";
};

const roleGradient = (role: string) => {
  const styles: Record<string, string> = {
    admin: "from-purple-500 to-pink-500",
    seller: "from-amber-400 to-orange-500",
    customer: "from-indigo-400 to-purple-500",
  };
  return styles[role] || "from-gray-400 to-gray-500";
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(1);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({ full_name: "", email: "", phone: "", password: "", role: "customer" as string });
  const [emailData, setEmailData] = useState({ subject: "", message: "" });

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async (ov?: { search?: string; role?: string; active?: string; page?: number }) => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(ov?.page ?? page), limit: "20" });
    const s = ov?.search ?? search;
    const r = ov?.role ?? roleFilter;
    const a = ov?.active ?? activeFilter;
    if (s) p.set("search", s);
    if (r) p.set("role", r);
    if (a !== "") p.set("is_active", a);
    try {
      const res = await fetch("/api/admin/users?" + p);
      const j = await res.json();
      setUsers(j.items || []);
      setPagination(j.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch {} finally { setLoading(false); }
  }, [search, roleFilter, activeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const fetchDetail = async (id: string) => {
    setModalLoading(true);
    try {
      const r = await fetch(`/api/admin/users/${id}`);
      const j = await r.json();
      setSelectedUser(j.item || null);
    } catch {} finally { setModalLoading(false); }
  };

  const setRole = async (id: string, role: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) { showToast(`Role changed to ${role}`); load(); }
      else { const j = await res.json(); showToast(j.error || "Failed", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setActionLoading(false); }
  };

  const toggleActive = async (id: string, cur: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !cur }),
      });
      if (res.ok) { showToast(cur ? "Account suspended" : "Account restored"); load(); if (selectedUser?.id === id) setSelectedUser(p => p ? { ...p, is_active: !cur } : null); }
      else { const j = await res.json(); showToast(j.error || "Failed", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setActionLoading(false); }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name || "this user"}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) { showToast("User deleted"); setModalMode(null); load(); }
      else { const j = await res.json(); showToast(j.error || "Failed", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setActionLoading(false); }
  };

  const createUser = async () => {
    if (!formData.email || !formData.password) { showToast("Email and password required", "error"); return; }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const j = await res.json();
      if (res.ok) { showToast("User created"); setModalMode(null); setFormData({ full_name: "", email: "", phone: "", password: "", role: "customer" }); load(); }
      else { showToast(j.error || "Failed", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setActionLoading(false); }
  };

  const editUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: formData.full_name, phone: formData.phone, role: formData.role }),
      });
      if (res.ok) { showToast("User updated"); setModalMode(null); load(); }
      else { const j = await res.json(); showToast(j.error || "Failed", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setActionLoading(false); }
  };

  const sendEmailToUser = async () => {
    if (!selectedUser?.email || !emailData.subject || !emailData.message) { showToast("All fields required", "error"); return; }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: selectedUser.email, ...emailData }),
      });
      if (res.ok) { showToast("Email sent"); setModalMode(null); setEmailData({ subject: "", message: "" }); }
      else { const j = await res.json(); showToast(j.error || "Failed", "error"); }
    } catch { showToast("Network error", "error"); }
    finally { setActionLoading(false); }
  };

  const hs = (v: string) => { setSearch(v); if (searchTimer.current) clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => { setPage(1); load({ search: v, page: 1 }); }, 400); };
  const hp = (pg: number) => { setPage(pg); load({ page: pg }); };

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">{pagination.total.toLocaleString()} total users</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setFormData({ full_name: "", email: "", phone: "", password: "", role: "customer" }); setModalMode("create"); }} className="text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Plus className="size-3.5" /> Add User
          </button>
          <button onClick={() => load()} className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
            <RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48 focus-within:border-indigo-400">
            <Search className="size-4 text-gray-400 shrink-0" />
            <input type="text" placeholder="Search users…" value={search} onChange={(e) => hs(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full" />
          </div>
          <div className="flex gap-1.5">
            {[{ v: "", l: "All" }, { v: "customer", l: "Customers" }, { v: "seller", l: "Sellers" }, { v: "admin", l: "Admins" }].map(f => (
              <button key={f.v} onClick={() => { setRoleFilter(f.v); setPage(1); load({ role: f.v, page: 1 }); }} className={"text-xs font-medium px-3 py-1.5 rounded-lg transition-all " + (roleFilter === f.v ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                {f.l}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {[{ v: "", l: "Any" }, { v: "true", l: "Active" }, { v: "false", l: "Suspended" }].map(f => (
              <button key={f.v} onClick={() => { setActiveFilter(f.v); setPage(1); load({ active: f.v, page: 1 }); }} className={"text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all " + (activeFilter === f.v ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
                {f.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className="size-5 animate-spin text-indigo-400" /><span className="ml-3 text-sm text-gray-500">Loading…</span></div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3"><Users className="size-10 opacity-30" /><p className="text-sm">No users found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {["User", "Email", "Role", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleGradient(u.role)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {(u.full_name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800">{u.full_name || "—"}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{u.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{u.email || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${roleBadge(u.role)}`}>
                        {u.role === "admin" && <Shield className="size-2.5 inline mr-1" />}
                        {u.role === "seller" && <Store className="size-2.5 inline mr-1" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.is_active ? (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                      ) : (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500">Suspended</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setModalMode("view"); fetchDetail(u.id); }} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500" title="View"><Eye className="size-3.5" /></button>
                        <button onClick={() => { setFormData({ full_name: u.full_name || "", email: u.email || "", phone: u.phone || "", password: "", role: u.role }); setModalMode("edit"); fetchDetail(u.id); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Edit"><Edit3 className="size-3.5" /></button>
                        {u.email && <button onClick={() => { setSelectedUser(u as UserDetail); setEmailData({ subject: "", message: "" }); setModalMode("email"); }} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500" title="Email"><Send className="size-3.5" /></button>}
                        <button onClick={() => toggleActive(u.id, u.is_active)} className={`p-1.5 rounded-lg ${u.is_active ? "hover:bg-red-50 text-red-400" : "hover:bg-emerald-50 text-emerald-500"}`} title={u.is_active ? "Suspend" : "Restore"}>
                          {u.is_active ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                        </button>
                        <button onClick={() => deleteUser(u.id, u.full_name || "")} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Delete"><Trash2 className="size-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-500">Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => hp(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="size-4 text-gray-600" /></button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const pg = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return <button key={pg} onClick={() => hp(pg)} className={"w-7 h-7 text-xs rounded-lg font-medium " + (pg === page ? "bg-indigo-600 text-white" : "hover:bg-gray-100 text-gray-600")}>{pg}</button>;
              })}
              <button onClick={() => hp(page + 1)} disabled={page >= pagination.pages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="size-4 text-gray-600" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModalMode(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === "view" && "User Details"}
                {modalMode === "edit" && "Edit User"}
                {modalMode === "create" && "Create User"}
                {modalMode === "email" && "Send Email"}
              </h2>
              <button onClick={() => setModalMode(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="size-5 text-gray-400" /></button>
            </div>

            <div className="p-6">
              {modalMode === "view" && (
                modalLoading ? (
                  <div className="flex items-center justify-center py-12"><RefreshCw className="size-5 animate-spin text-indigo-400" /></div>
                ) : selectedUser ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${roleGradient(selectedUser.role)} flex items-center justify-center text-white text-xl font-bold`}>
                        {(selectedUser.full_name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{selectedUser.full_name || "—"}</h3>
                        <p className="text-sm text-gray-500">{selectedUser.email || "—"}</p>
                        <div className="flex gap-1.5 mt-1">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${roleBadge(selectedUser.role)}`}>{selectedUser.role}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${selectedUser.is_active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                            {selectedUser.is_active ? "Active" : "Suspended"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: ShoppingBag, label: "Orders", value: selectedUser.orderCount },
                        { icon: Star, label: "Reviews", value: selectedUser.reviewCount },
                        { icon: ShoppingBag, label: "Total Spent", value: `$${selectedUser.totalSpent.toFixed(2)}` },
                      ].map(s => (
                        <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                          <s.icon className="size-4 text-indigo-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">{s.label}</p>
                          <p className="text-sm font-semibold text-gray-900">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm"><Phone className="size-4 text-gray-400" /><span className="text-gray-600">{selectedUser.phone || "No phone"}</span></div>
                      <div className="flex items-center gap-2 text-sm"><Mail className="size-4 text-gray-400" /><span className="text-gray-600">{selectedUser.email || "No email"}</span></div>
                      <div className="flex items-center gap-2 text-sm"><Calendar className="size-4 text-gray-400" /><span className="text-gray-600">Joined {new Date(selectedUser.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></div>
                    </div>

                    {/* Role change buttons */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Change Role</h4>
                      <div className="flex gap-2">
                        {["customer", "seller", "admin"].map(r => (
                          <button
                            key={r}
                            onClick={() => setRole(selectedUser.id, r)}
                            disabled={selectedUser.role === r || actionLoading}
                            className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg capitalize transition-colors ${selectedUser.role === r ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} disabled:opacity-50`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button onClick={() => { setFormData({ full_name: selectedUser.full_name || "", email: selectedUser.email || "", phone: selectedUser.phone || "", password: "", role: selectedUser.role }); setModalMode("edit"); }} className="flex-1 text-sm font-medium px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center gap-1.5">
                        <Edit3 className="size-3.5" /> Edit
                      </button>
                      {selectedUser.email && (
                        <button onClick={() => { setEmailData({ subject: "", message: "" }); setModalMode("email"); }} className="flex-1 text-sm font-medium px-4 py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center gap-1.5">
                          <Send className="size-3.5" /> Email
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(selectedUser.id, selectedUser.is_active)}
                        disabled={actionLoading}
                        className={`flex-1 text-sm font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 ${selectedUser.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}
                      >
                        {selectedUser.is_active ? <><UserX className="size-3.5" /> Suspend</> : <><UserCheck className="size-3.5" /> Restore</>}
                      </button>
                    </div>
                  </div>
                ) : <p className="text-center text-gray-400 py-8">User not found</p>
              )}

              {modalMode === "create" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
                    <input type="text" value={formData.full_name} onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email *</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="user@example.com" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Password *</label>
                    <input type="password" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Min 6 characters" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+1 234 567 890" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</label>
                    <select value={formData.role} onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="customer">Customer</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button onClick={createUser} disabled={actionLoading} className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {actionLoading ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />} Create User
                  </button>
                </div>
              )}

              {modalMode === "edit" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
                    <input type="text" value={formData.full_name} onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</label>
                    <select value={formData.role} onChange={(e) => setFormData(p => ({ ...p, role: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="customer">Customer</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={editUser} disabled={actionLoading} className="flex-1 text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {actionLoading ? <RefreshCw className="size-4 animate-spin" /> : <Edit3 className="size-4" />} Save
                    </button>
                    <button onClick={() => setModalMode(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  </div>
                </div>
              )}

              {modalMode === "email" && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${roleGradient(selectedUser?.role || "customer")} flex items-center justify-center text-white text-xs font-bold`}>
                      {(selectedUser?.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{selectedUser?.full_name || "—"}</p>
                      <p className="text-xs text-gray-500">{selectedUser?.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</label>
                    <input type="text" value={emailData.subject} onChange={(e) => setEmailData(p => ({ ...p, subject: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Email subject..." />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Message</label>
                    <textarea value={emailData.message} onChange={(e) => setEmailData(p => ({ ...p, message: e.target.value }))} rows={5} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Type your message..." />
                  </div>
                  <button onClick={sendEmailToUser} disabled={actionLoading} className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {actionLoading ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />} Send Email
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
