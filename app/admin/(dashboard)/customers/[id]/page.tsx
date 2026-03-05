"use client";

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
    fetch(`/api/admin/users/${id}`)
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
    const res = await fetch(`/api/admin/users/${id}`, {
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
          {msg && <span className={`text-xs font-semibold ${msg.ok ? "text-green-500" : "text-red-500"}`}>{msg.text}</span>}
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
              <span className={`px-2.5 py-1 rounded-full font-semibold ${profile.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                {profile.is_active ? "Active" : "Banned"}
              </span>
              <span className="capitalize bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">{profile.role}</span>
            </div>
          </div>

          {/* Stats cards */}
          {[
            { icon: ShoppingBag, label: "Total Orders", value: profile.orderCount ?? 0, color: "#f97316" },
            { icon: Wallet,      label: "Total Spent",  value: `$${Number(profile.totalSpent ?? 0).toFixed(2)}`, color: "#059669" },
            { icon: Star,        label: "Reviews",      value: profile.reviewCount ?? 0, color: "#f59e0b" },
            { icon: Wallet,      label: "Wallet",       value: `$${Number(profile.wallet_balance ?? 0).toFixed(2)}`, color: "#0ea5e9" },
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
