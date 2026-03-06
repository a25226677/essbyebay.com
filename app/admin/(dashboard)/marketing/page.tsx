"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, Tag, ImageIcon, Plus, ToggleLeft, ToggleRight, Calendar, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const campaigns = [
  { id: "C001", name: "Spring Sale 2026", type: "Discount", discount: "20%", start: "Mar 1, 2026", end: "Mar 31, 2026", status: "Scheduled" },
  { id: "C002", name: "Flash Friday Deals", type: "Flash Sale", discount: "30-50%", start: "Feb 28, 2026", end: "Mar 2, 2026", status: "Active" },
  { id: "C003", name: "New User Promo", type: "Welcome", discount: "10%", start: "Jan 1, 2026", end: "Dec 31, 2026", status: "Active" },
  { id: "C004", name: "Holiday Clearance", type: "Clearance", discount: "40%", start: "Jan 15, 2026", end: "Feb 15, 2026", status: "Ended" },
];

export default function MarketingPage() {
  const [active, setActive] = useState<"campaigns" | "coupons" | "banners">("campaigns");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [loadingBanners, setLoadingBanners] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Marketing</h1>
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <Megaphone className="size-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Sample Data</p>
              <p className="text-xs text-amber-600">Campaigns are sample data for preview. Automated campaign scheduling will be available in a future update.</p>
            </div>
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
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs font-semibold text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{c.type}</td>
                      <td className="px-4 py-3 text-xs font-bold text-orange-600">{c.discount}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="size-3" />{c.start} → {c.end}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          c.status === "Active" ? "bg-green-100 text-green-700" :
                          c.status === "Scheduled" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                        }`}>{c.status}</span>
                      </td>
                    </tr>
                  ))}
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
