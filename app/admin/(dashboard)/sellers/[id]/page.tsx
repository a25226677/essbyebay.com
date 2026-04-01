"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, Shield, ShieldCheck, Star, Package,
  DollarSign, Store, Calendar, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SellerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  wallet_balance: number;
  credit_score: number;
  package: string | null;
  created_at: string;
  shop: {
    id: string;
    name: string;
    slug: string;
    is_verified: boolean;
    rating: number;
    product_count: number;
    logo_url: string | null;
    banner_url: string | null;
    description: string | null;
  } | null;
  orderCount: number;
  totalSpent: number;
  reviewCount: number;
  addresses: { id: string; label: string | null; city: string; country: string }[];
};

export default function SellerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    authPassword: "",
    transactionPassword: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setProfile(json.item);
      } catch {
        toast.error("Failed to load seller profile");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const toggleActive = async () => {
    if (!profile) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !profile.is_active }),
      });
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, is_active: !prev.is_active } : prev);
        toast.success(profile.is_active ? "Seller suspended" : "Seller activated");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  const toggleVerify = async () => {
    if (!profile?.shop) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_verified: !profile.shop.is_verified }),
      });
      if (res.ok) {
        setProfile(prev => prev && prev.shop ? {
          ...prev,
          shop: { ...prev.shop, is_verified: !prev.shop.is_verified }
        } : prev);
        toast.success(profile.shop.is_verified ? "Verification removed" : "Seller verified");
      }
    } catch {
      toast.error("Failed to update verification");
    }
  };

  const updateSecurity = async () => {
    const authPassword = securityForm.authPassword.trim();
    const transactionPassword = securityForm.transactionPassword.trim();

    if (!authPassword && !transactionPassword) {
      toast.error("Enter at least one password to update");
      return;
    }

    if (authPassword && authPassword.length < 8) {
      toast.error("Login password must be at least 8 characters");
      return;
    }

    if (transactionPassword && !/^\d{6}$/.test(transactionPassword)) {
      toast.error("Transaction password must be exactly 6 digits");
      return;
    }

    setSavingSecurity(true);

    try {
      const payload: Record<string, string> = {};
      if (authPassword) payload.auth_password = authPassword;
      if (transactionPassword) payload.transaction_password = transactionPassword;

      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update seller security");
      }

      setSecurityForm({ authPassword: "", transactionPassword: "" });
      toast.success("Seller security credentials updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update seller security");
    } finally {
      setSavingSecurity(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Seller not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/sellers")}>
          Back to Sellers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/sellers")}
          className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="size-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Seller Profile</h1>
          <p className="text-xs text-gray-500">ID: {profile.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-600 shrink-0">
              {(profile.full_name || "S").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{profile.full_name || "Unknown"}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {profile.is_active ? "Active" : "Suspended"}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {profile.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="size-4 text-gray-400" />
                <span className="truncate">{profile.email}</span>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="size-4 text-gray-400" />
                {profile.phone}
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="size-4 text-gray-400" />
              Joined {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Wallet Balance</span>
              <span className="font-semibold text-green-600">${Number(profile.wallet_balance || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Credit Score</span>
              <span className="font-semibold text-gray-800">{profile.credit_score}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Package</span>
              <span className="font-semibold text-gray-800">{profile.package || "None"}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <Button size="sm" variant={profile.is_active ? "destructive" : "default"}
              onClick={toggleActive} disabled={toggling} className="w-full">
              <Shield className="size-4 mr-1" />
              {profile.is_active ? "Suspend Seller" : "Activate Seller"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => router.push(`/admin/sellers/payouts?seller_id=${id}`)} className="w-full">
              <DollarSign className="size-4 mr-1" /> View Payouts
            </Button>
          </div>
        </div>

        {/* Middle - Shop Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Store className="size-4 text-orange-500" /> Shop Information
          </h3>
          {profile.shop ? (
            <>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Shop Name</p>
                  <p className="text-sm font-semibold text-gray-800">{profile.shop.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Slug</p>
                  <p className="text-sm text-gray-600">{profile.shop.slug}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Products</p>
                    <p className="text-lg font-bold text-gray-800">{profile.shop.product_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      <span className="text-lg font-bold text-gray-800">{Number(profile.shop.rating || 0).toFixed(1)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Verified</p>
                    <p className="flex items-center gap-1">
                      {profile.shop.is_verified
                        ? <><ShieldCheck className="size-4 text-green-500" /><span className="text-sm font-semibold text-green-600">Yes</span></>
                        : <><Shield className="size-4 text-gray-400" /><span className="text-sm text-gray-500">No</span></>
                      }
                    </p>
                  </div>
                </div>
                {profile.shop.description && (
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-3">{profile.shop.description}</p>
                  </div>
                )}
              </div>
              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <Button size="sm" variant="outline" onClick={toggleVerify} className="flex-1">
                  {profile.shop.is_verified ? "Remove Verification" : "Verify Shop"}
                </Button>
                <Link href={`/shop/${profile.shop.slug}`}>
                  <Button size="sm" variant="outline">View Shop</Button>
                </Link>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">No shop created yet</p>
          )}
        </div>

        {/* Right - Stats */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Security Reset (Admin)</h3>
            <p className="text-xs text-gray-500">
              Reset seller login password and storehouse transaction password from here.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">New Login Password</Label>
              <Input
                type="password"
                placeholder="At least 8 characters"
                value={securityForm.authPassword}
                onChange={(e) =>
                  setSecurityForm((prev) => ({ ...prev, authPassword: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600">New Transaction Password</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="6 digits"
                value={securityForm.transactionPassword}
                onChange={(e) =>
                  setSecurityForm((prev) => ({ ...prev, transactionPassword: e.target.value }))
                }
              />
            </div>

            <Button
              size="sm"
              onClick={updateSecurity}
              disabled={savingSecurity}
              className="w-full"
            >
              {savingSecurity ? "Updating..." : "Update Security Credentials"}
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Orders", value: profile.orderCount, icon: Package },
                { label: "Reviews", value: profile.reviewCount, icon: Star },
                { label: "Total Sales", value: `$${Number(profile.totalSpent || 0).toFixed(2)}`, icon: DollarSign },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <Icon className="size-5 text-orange-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-800">{stat.value}</p>
                    <p className="text-[10px] text-gray-500">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {profile.addresses.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Addresses</h3>
              <div className="space-y-2">
                {profile.addresses.map(addr => (
                  <div key={addr.id} className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    <p className="font-medium text-gray-800">{addr.label || "Address"}</p>
                    <p>{addr.city}, {addr.country}</p>
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
