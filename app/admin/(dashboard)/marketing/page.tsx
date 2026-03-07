"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, Tag, ImageIcon, Plus, ToggleLeft, ToggleRight, Trash2, RefreshCw, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

interface Coupon {
  id: string; code: string; discount_type: string; discount_value: number;
  min_order_amount: number; max_uses: number; used_count: number; is_active: boolean;
  expires_at: string | null; created_at: string;
}
interface Banner {
  id: string; title: string; image_url: string; link_url: string | null;
  position: string; is_active: boolean; sort_order: number;
}
interface Campaign {
  id: string; name: string; type: string; discount: string; start: string; end: string; status: "Active" | "Scheduled" | "Ended";
}

const defaultCampaigns: Campaign[] = [
  { id: "C001", name: "Spring Sale 2026", type: "Discount", discount: "20%", start: "2026-03-01", end: "2026-03-31", status: "Scheduled" },
  { id: "C002", name: "Flash Friday Deals", type: "Flash Sale", discount: "30-50%", start: "2026-02-28", end: "2026-03-02", status: "Active" },
  { id: "C003", name: "New User Promo", type: "Welcome", discount: "10%", start: "2026-01-01", end: "2026-12-31", status: "Active" },
  { id: "C004", name: "Holiday Clearance", type: "Clearance", discount: "40%", start: "2026-01-15", end: "2026-02-15", status: "Ended" },
];

export default function MarketingPage() {
  const [active, setActive] = useState<"campaigns" | "coupons" | "banners">("campaigns");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>(defaultCampaigns);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [campaignModal, setCampaignModal] = useState<Campaign | null>(null);
  const [showCampaignForm, setShowCampaignForm] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch("/api/admin/coupons?limit=50");
      const json = await res.json();
      setCoupons(json.items || []);
    } catch {} finally { setLoadingCoupons(false); }
  }, []);

  const fetchBanners = useCallback(async () => {
    setLoadingBanners(true);
    try {
      const res = await fetch("/api/admin/banners");
      const json = await res.json();
      setBanners(json.items || json || []);
    } catch {} finally { setLoadingBanners(false); }
  }, []);

  useEffect(() => {
    if (active === "coupons") fetchCoupons();
    if (active === "banners") fetchBanners();
  }, [active, fetchCoupons, fetchBanners]);

  const toggleCoupon = async (c: Coupon) => {
    try {
      await fetch("/api/admin/coupons", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, is_active: !c.is_active }),
      });
      toast.success(c.is_active ? "Coupon disabled" : "Coupon enabled");
      fetchCoupons();
    } catch { toast.error("Failed to toggle coupon"); }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
    toast.success("Coupon deleted");
    fetchCoupons();
  };

  const saveCampaign = (data: Campaign) => {
    if (campaigns.find(c => c.id === data.id)) {
      setCampaigns(prev => prev.map(c => c.id === data.id ? data : c));
      toast.success("Campaign updated");
    } else {
      setCampaigns(prev => [...prev, data]);
      toast.success("Campaign created");
    }
    setShowCampaignForm(false);
    setCampaignModal(null);
  };

  const deleteCampaign = (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    setCampaigns(prev => prev.filter(c => c.id !== id));
    toast.success("Campaign deleted");
  };

  const toggleCampaignStatus = (id: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== id) return c;
      const next = c.status === "Active" ? "Ended" : "Active";
      return { ...c, status: next };
    }));
    toast.success("Campaign status updated");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Marketing</h1>
        {active === "campaigns" && (
          <Button size="sm" className="gap-2" onClick={() => { setCampaignModal(null); setShowCampaignForm(true); }}>
            <Plus className="size-4" /> New Campaign
          </Button>
        )}
        {active === "coupons" && (
          <Link href="/admin/marketing/coupons">
            <Button size="sm" className="gap-2"><Plus className="size-4" /> Manage Coupons</Button>
          </Link>
        )}
        {active === "banners" && (
          <Link href="/admin/marketing/banners">
            <Button size="sm" className="gap-2"><Plus className="size-4" /> Manage Banners</Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "campaigns", label: "Campaigns", icon: Megaphone },
          { key: "coupons", label: "Coupons", icon: Tag },
          { key: "banners", label: "Banners", icon: ImageIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key as typeof active)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-md transition-colors font-medium ${
                active === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Campaigns Tab */}
      {active === "campaigns" && (
        <>
          {showCampaignForm && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setShowCampaignForm(false); setCampaignModal(null); }}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">{campaignModal ? "Edit Campaign" : "New Campaign"}</h3>
                  <button onClick={() => { setShowCampaignForm(false); setCampaignModal(null); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="size-4 text-gray-400" /></button>
                </div>
                <CampaignForm initial={campaignModal} onSave={saveCampaign} onCancel={() => { setShowCampaignForm(false); setCampaignModal(null); }} />
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => { setCampaignModal(null); setShowCampaignForm(true); }}>
              <Plus className="size-4" /> New Campaign
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-3 text-left">Campaign</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Discount</th>
                    <th className="px-4 py-3 text-left">Duration</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-semibold text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{c.type}</td>
                      <td className="px-4 py-3 text-xs font-bold text-orange-600">{c.discount}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(c.start).toLocaleDateString()} → {new Date(c.end).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleCampaignStatus(c.id)} className={`text-[10px] px-2 py-0.5 rounded-full font-medium cursor-pointer ${
                          c.status === "Active" ? "bg-green-100 text-green-700" :
                          c.status === "Scheduled" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                        }`}>{c.status}</button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setCampaignModal(c); setShowCampaignForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                            <Edit className="size-3.5" />
                          </button>
                          <button onClick={() => deleteCampaign(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">
                      <Megaphone className="size-8 mx-auto mb-2 opacity-30" />No campaigns yet
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Coupons Tab — Live data */}
      {active === "coupons" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {loadingCoupons ? (
            <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw className="size-5 animate-spin mr-2" /> Loading…</div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Tag className="size-8 opacity-30" />
              <p className="text-sm">No coupons yet</p>
              <Link href="/admin/marketing/coupons" className="text-xs text-indigo-600 hover:underline mt-1">Create your first coupon →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500">
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Discount</th>
                    <th className="px-4 py-3 text-left">Usage</th>
                    <th className="px-4 py-3 text-left">Expiry</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => {
                    const expired = c.expires_at && new Date(c.expires_at) < new Date();
                    return (
                      <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{c.code}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-orange-600">
                          {c.discount_type === "percentage" ? `${c.discount_value}%` : `$${c.discount_value}`}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{c.used_count} / {c.max_uses}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-4 py-3">
                          {expired ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Expired</span>
                          ) : c.is_active ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Active</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-600">Disabled</span>
                          )}
                        </td>
                        <td className="px-4 py-3 flex gap-1">
                          <button onClick={() => toggleCoupon(c)} className="text-gray-400 hover:text-gray-600">
                            {c.is_active ? <ToggleRight className="size-5 text-green-500" /> : <ToggleLeft className="size-5 text-gray-300" />}
                          </button>
                          <button onClick={() => deleteCoupon(c.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Banners Tab — Live data */}
      {active === "banners" && (
        <div className="space-y-3">
          {loadingBanners ? (
            <div className="flex items-center justify-center py-16 text-gray-400"><RefreshCw className="size-5 animate-spin mr-2" /> Loading…</div>
          ) : banners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <ImageIcon className="size-8 opacity-30" />
              <p className="text-sm">No banners yet</p>
              <Link href="/admin/marketing/banners" className="text-xs text-indigo-600 hover:underline mt-1">Create your first banner →</Link>
            </div>
          ) : (
            banners.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {b.image_url ? (
                      <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="size-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{b.title}</p>
                    <p className="text-xs text-gray-500">{b.position} · Order: {b.sort_order}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {b.is_active ? <ToggleRight className="size-6 text-green-500" /> : <ToggleLeft className="size-6 text-gray-300" />}
                  <Link href="/admin/marketing/banners" className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Edit</Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CampaignForm({ initial, onSave, onCancel }: { initial: Campaign | null; onSave: (c: Campaign) => void; onCancel: () => void }) {
  const [form, setForm] = useState<Campaign>(initial || {
    id: `C${String(Date.now()).slice(-4)}`,
    name: "", type: "Discount", discount: "", start: "", end: "", status: "Scheduled",
  });
  const set = (key: keyof Campaign, val: string) => setForm(p => ({ ...p, [key]: val }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.discount || !form.start || !form.end) {
      toast.error("All fields are required");
      return;
    }
    onSave(form);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label>Campaign Name</Label>
        <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Spring Sale 2026" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <select value={form.type} onChange={e => set("type", e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
            <option>Discount</option><option>Flash Sale</option><option>Welcome</option><option>Clearance</option><option>Seasonal</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Discount</Label>
          <Input value={form.discount} onChange={e => set("discount", e.target.value)} placeholder="20%" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Start Date</Label>
          <Input type="date" value={form.start} onChange={e => set("start", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>End Date</Label>
          <Input type="date" value={form.end} onChange={e => set("end", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <select value={form.status} onChange={e => set("status", e.target.value as Campaign["status"])} className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm bg-white">
          <option value="Scheduled">Scheduled</option><option value="Active">Active</option><option value="Ended">Ended</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">{initial ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
}
