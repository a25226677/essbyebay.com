'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, RefreshCw, Store, ChevronLeft, ChevronRight, CheckCircle, AlertCircle,
  Eye, Send, Edit3, Trash2, Plus, X, Mail, Phone, Calendar,
  Star, UserCheck, UserX, Package, BadgeCheck
} from 'lucide-react';

type Shop = { id: string; name: string; slug: string; is_verified: boolean; rating: number; product_count: number };
type Seller = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  shops: Shop[];
};

type SellerDetail = Seller & {
  addresses: { id: string; label: string | null; city: string; country: string; line_1: string }[];
  orderCount: number;
  totalSpent: number;
  reviewCount: number;
  shop: (Shop & { logo_url: string | null; banner_url: string | null; description: string | null; created_at: string }) | null;
};

type Pagination = { page: number; limit: number; total: number; pages: number };
type ModalMode = null | 'view' | 'edit' | 'create' | 'email';

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedSeller, setSelectedSeller] = useState<SellerDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [formData, setFormData] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [emailData, setEmailData] = useState({ subject: '', message: '' });

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSellers = useCallback(async (ov?: { search?: string; active?: string; page?: number }) => {
    setLoading(true);
    const p = new URLSearchParams({ role: 'seller', page: String(ov?.page ?? page), limit: '20' });
    const s = ov?.search ?? search;
    const a = ov?.active ?? activeFilter;
    if (s) p.set('search', s);
    if (a !== '') p.set('is_active', a);
    try {
      const r = await fetch('/api/admin/users?' + p);
      const j = await r.json();
      setSellers(j.items || []);
      setPagination(j.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch {} finally { setLoading(false); }
  }, [search, activeFilter, page]);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const fetchSellerDetail = async (id: string) => {
    setModalLoading(true);
    try {
      const r = await fetch(`/api/admin/users/${id}`);
      const j = await r.json();
      setSelectedSeller(j.item || null);
    } catch {} finally { setModalLoading(false); }
  };

  const toggleActive = async (id: string, cur: boolean, name: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !cur }),
      });
      if (res.ok) {
        showToast(`${name || 'Seller'} ${cur ? 'suspended' : 'restored'}`);
        fetchSellers();
        if (selectedSeller?.id === id) setSelectedSeller(prev => prev ? { ...prev, is_active: !cur } : null);
      } else { const j = await res.json(); showToast(j.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); }
    finally { setActionLoading(false); }
  };

  const toggleShopVerify = async (shopId: string, verified: boolean, shopName: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: !verified }),
      });
      if (res.ok) {
        showToast(`${shopName} ${verified ? 'unverified' : 'verified'}`);
        fetchSellers();
        if (selectedSeller?.shop?.id === shopId) {
          setSelectedSeller(prev => prev && prev.shop ? { ...prev, shop: { ...prev.shop, is_verified: !verified } } : prev);
        }
      } else { const j = await res.json(); showToast(j.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); }
    finally { setActionLoading(false); }
  };

  const deleteSeller = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name || 'this seller'}? This also removes their shop and products.`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) { showToast(`${name || 'Seller'} deleted`); setModalMode(null); fetchSellers(); }
      else { const j = await res.json(); showToast(j.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); }
    finally { setActionLoading(false); }
  };

  const createSeller = async () => {
    if (!formData.email || !formData.password) { showToast('Email and password are required', 'error'); return; }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'seller' }),
      });
      const j = await res.json();
      if (res.ok) { showToast('Seller created'); setModalMode(null); setFormData({ full_name: '', email: '', phone: '', password: '' }); fetchSellers(); }
      else { showToast(j.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); }
    finally { setActionLoading(false); }
  };

  const editSeller = async () => {
    if (!selectedSeller) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedSeller.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: formData.full_name, phone: formData.phone }),
      });
      if (res.ok) { showToast('Seller updated'); setModalMode(null); fetchSellers(); }
      else { const j = await res.json(); showToast(j.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); }
    finally { setActionLoading(false); }
  };

  const sendEmailToSeller = async () => {
    if (!selectedSeller?.email || !emailData.subject || !emailData.message) { showToast('All fields required', 'error'); return; }
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedSeller.email, subject: emailData.subject, message: emailData.message }),
      });
      if (res.ok) { showToast('Email sent'); setModalMode(null); setEmailData({ subject: '', message: '' }); }
      else { const j = await res.json(); showToast(j.error || 'Failed', 'error'); }
    } catch { showToast('Network error', 'error'); }
    finally { setActionLoading(false); }
  };

  const hs = (v: string) => { setSearch(v); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => { setPage(1); fetchSellers({ search: v, page: 1 }); }, 400); };
  const hf = (v: string) => { setActiveFilter(v); setPage(1); fetchSellers({ active: v, page: 1 }); };
  const hp = (pg: number) => { setPage(pg); fetchSellers({ page: pg }); };

  const openView = (s: Seller) => { setModalMode('view'); fetchSellerDetail(s.id); };
  const openEdit = (s: Seller) => { setFormData({ full_name: s.full_name || '', email: s.email || '', phone: s.phone || '', password: '' }); setModalMode('edit'); fetchSellerDetail(s.id); };
  const openEmail = (s: Seller) => { setSelectedSeller(s as SellerDetail); setEmailData({ subject: '', message: '' }); setModalMode('email'); };
  const openCreate = () => { setFormData({ full_name: '', email: '', phone: '', password: '' }); setModalMode('create'); };

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sellers</h1>
          <p className="text-xs text-gray-500 mt-0.5">{pagination.total.toLocaleString()} registered sellers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openCreate} className="text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
            <Plus className="size-3.5" /> Add Seller
          </button>
          <button onClick={() => fetchSellers()} className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
            <RefreshCw className={'size-3.5 ' + (loading ? 'animate-spin' : '')} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48 focus-within:border-indigo-400">
            <Search className="size-4 text-gray-400 shrink-0" />
            <input type="text" placeholder="Search sellers…" value={search} onChange={(e) => hs(e.target.value)} className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full" />
          </div>
          <div className="flex gap-1.5">
            {[{ v: '', l: 'All' }, { v: 'true', l: 'Active' }, { v: 'false', l: 'Suspended' }].map(f => (
              <button key={f.v} onClick={() => hf(f.v)} className={'text-xs font-medium px-3 py-1.5 rounded-lg transition-all ' + (activeFilter === f.v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {f.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><RefreshCw className="size-5 animate-spin text-indigo-400" /><span className="ml-3 text-sm text-gray-500">Loading…</span></div>
        ) : sellers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3"><Store className="size-10 opacity-30" /><p className="text-sm">No sellers found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Seller', 'Email', 'Shop', 'Shop Status', 'Account', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sellers.map(s => {
                  const shop = s.shops?.[0];
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                            {(s.full_name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">{s.full_name || '—'}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{s.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">{s.email || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-700 font-medium">{shop?.name || <span className="text-gray-300">No shop</span>}</td>
                      <td className="px-5 py-3.5">
                        {shop ? (
                          shop.is_verified ? (
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1 w-fit">
                              <CheckCircle className="size-3" /> Verified
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 flex items-center gap-1 w-fit">
                              <AlertCircle className="size-3" /> Pending
                            </span>
                          )
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.is_active ? (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                        ) : (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-500">Suspended</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openView(s)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500" title="View">
                            <Eye className="size-3.5" />
                          </button>
                          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Edit">
                            <Edit3 className="size-3.5" />
                          </button>
                          {s.email && (
                            <button onClick={() => openEmail(s)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500" title="Email">
                              <Send className="size-3.5" />
                            </button>
                          )}
                          {shop && (
                            <button
                              onClick={() => toggleShopVerify(shop.id, shop.is_verified, shop.name)}
                              className={`p-1.5 rounded-lg ${shop.is_verified ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-emerald-500'}`}
                              title={shop.is_verified ? 'Unverify' : 'Verify'}
                            >
                              <BadgeCheck className="size-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => toggleActive(s.id, s.is_active, s.full_name || '')}
                            className={`p-1.5 rounded-lg ${s.is_active ? 'hover:bg-red-50 text-red-400' : 'hover:bg-emerald-50 text-emerald-500'}`}
                            title={s.is_active ? 'Suspend' : 'Restore'}
                          >
                            {s.is_active ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                          </button>
                          <button onClick={() => deleteSeller(s.id, s.full_name || '')} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Delete">
                            <Trash2 className="size-3.5" />
                          </button>
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <span className="text-xs text-gray-500">Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => hp(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="size-4 text-gray-600" /></button>
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const pg = Math.max(1, Math.min(page - 2, pagination.pages - 4)) + i;
                return <button key={pg} onClick={() => hp(pg)} className={'w-7 h-7 text-xs rounded-lg font-medium ' + (pg === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-600')}>{pg}</button>;
              })}
              <button onClick={() => hp(page + 1)} disabled={page >= pagination.pages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="size-4 text-gray-600" /></button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal ─────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModalMode(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {modalMode === 'view' && 'Seller Details'}
                {modalMode === 'edit' && 'Edit Seller'}
                {modalMode === 'create' && 'Create Seller'}
                {modalMode === 'email' && 'Send Email'}
              </h2>
              <button onClick={() => setModalMode(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="size-5 text-gray-400" /></button>
            </div>

            <div className="p-6">
              {/* VIEW */}
              {modalMode === 'view' && (
                modalLoading ? (
                  <div className="flex items-center justify-center py-12"><RefreshCw className="size-5 animate-spin text-indigo-400" /></div>
                ) : selectedSeller ? (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold">
                        {(selectedSeller.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{selectedSeller.full_name || '—'}</h3>
                        <p className="text-sm text-gray-500">{selectedSeller.email || '—'}</p>
                        <div className="flex gap-1.5 mt-1">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${selectedSeller.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {selectedSeller.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Shop info */}
                    {selectedSeller.shop && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Store className="size-4 text-amber-600" />
                          <h4 className="text-sm font-semibold text-amber-900">{selectedSeller.shop.name}</h4>
                          {selectedSeller.shop.is_verified ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5"><CheckCircle className="size-2.5" /> Verified</span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5"><AlertCircle className="size-2.5" /> Pending</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-3">
                          <div className="text-center">
                            <Package className="size-4 text-amber-500 mx-auto mb-1" />
                            <p className="text-xs text-amber-700">{selectedSeller.shop.product_count} Products</p>
                          </div>
                          <div className="text-center">
                            <Star className="size-4 text-amber-500 mx-auto mb-1" />
                            <p className="text-xs text-amber-700">{selectedSeller.shop.rating} Rating</p>
                          </div>
                          <div className="text-center">
                            <Calendar className="size-4 text-amber-500 mx-auto mb-1" />
                            <p className="text-xs text-amber-700">Since {new Date(selectedSeller.shop.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {selectedSeller.shop.description && (
                          <p className="text-xs text-amber-800 mt-3 line-clamp-2">{selectedSeller.shop.description}</p>
                        )}
                        <button
                          onClick={() => toggleShopVerify(selectedSeller.shop!.id, selectedSeller.shop!.is_verified, selectedSeller.shop!.name)}
                          disabled={actionLoading}
                          className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${selectedSeller.shop.is_verified ? 'bg-amber-200 text-amber-800 hover:bg-amber-300' : 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300'}`}
                        >
                          {selectedSeller.shop.is_verified ? 'Remove Verification' : 'Verify Shop'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="size-4 text-gray-400" />
                        <span className="text-gray-600">{selectedSeller.phone || 'No phone'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="size-4 text-gray-400" />
                        <span className="text-gray-600">{selectedSeller.email || 'No email'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-4 text-gray-400" />
                        <span className="text-gray-600">Joined {new Date(selectedSeller.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => { setFormData({ full_name: selectedSeller.full_name || '', email: selectedSeller.email || '', phone: selectedSeller.phone || '', password: '' }); setModalMode('edit'); }}
                        className="flex-1 text-sm font-medium px-4 py-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="size-3.5" /> Edit
                      </button>
                      {selectedSeller.email && (
                        <button
                          onClick={() => { setEmailData({ subject: '', message: '' }); setModalMode('email'); }}
                          className="flex-1 text-sm font-medium px-4 py-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Send className="size-3.5" /> Email
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(selectedSeller.id, selectedSeller.is_active, selectedSeller.full_name || '')}
                        disabled={actionLoading}
                        className={`flex-1 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${selectedSeller.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                      >
                        {selectedSeller.is_active ? <><UserX className="size-3.5" /> Suspend</> : <><UserCheck className="size-3.5" /> Restore</>}
                      </button>
                    </div>
                  </div>
                ) : <p className="text-center text-gray-400 py-8">Seller not found</p>
              )}

              {/* CREATE */}
              {modalMode === 'create' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
                    <input type="text" value={formData.full_name} onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Seller Name" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email *</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="seller@example.com" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Password *</label>
                    <input type="password" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Min 6 characters" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+1 234 567 890" />
                  </div>
                  <button onClick={createSeller} disabled={actionLoading} className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {actionLoading ? <RefreshCw className="size-4 animate-spin" /> : <Plus className="size-4" />} Create Seller
                  </button>
                </div>
              )}

              {/* EDIT */}
              {modalMode === 'edit' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Name</label>
                    <input type="text" value={formData.full_name} onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={editSeller} disabled={actionLoading} className="flex-1 text-sm font-medium px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                      {actionLoading ? <RefreshCw className="size-4 animate-spin" /> : <Edit3 className="size-4" />} Save Changes
                    </button>
                    <button onClick={() => setModalMode(null)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  </div>
                </div>
              )}

              {/* EMAIL */}
              {modalMode === 'email' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      {(selectedSeller?.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{selectedSeller?.full_name || '—'}</p>
                      <p className="text-xs text-gray-500">{selectedSeller?.email}</p>
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
                  <button onClick={sendEmailToSeller} disabled={actionLoading} className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
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
