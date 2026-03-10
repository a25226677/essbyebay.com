"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { FileUploadDropzone } from "@/components/seller/file-upload-dropzone";

type ShopData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  rating: number;
  product_count: number;
};

export default function ShopSettingPage() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logo_url: "",
    banner_url: "",
  });

  useEffect(() => {
    async function loadShop() {
      setLoading(true);
      try {
        const res = await fetch("/api/seller/settings", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load shop");
        const s: ShopData = json.shop;
        setShop(s);
        setFormData({
          name: s?.name ?? "",
          description: s?.description ?? "",
          logo_url: s?.logo_url ?? "",
          banner_url: s?.banner_url ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadShop();
  }, []);

  const handleChange = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const res = await fetch("/api/seller/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSuccess("Shop settings saved successfully!");
      setTimeout(() => setSuccess(""), 4000);
      // Notify sidebar/header to refresh shop data immediately
      window.dispatchEvent(new CustomEvent("shop-settings-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Shop Setting</h1>
        {shop?.is_verified && (
          <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-full px-3 py-1">
            <CheckCircle className="size-3.5" /> Verified Shop
          </span>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="size-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-bold text-gray-800">Basic Information</h2>

          <div>
            <Label className="text-sm mb-1.5 block">Shop Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Your shop name"
            />
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">Shop Description</Label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm resize-none outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Brief description of your shop"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
            />
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">Shop Logo</Label>
            <FileUploadDropzone
              bucket="shop-assets"
              folder="logos"
              accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp", ".svg"] }}
              acceptedTypes={["image/"]}
              maxSizeMB={2}
              variant="avatar"
              value={
                formData.logo_url
                  ? [{ name: "logo", size: 0, type: "image/png", url: formData.logo_url, path: "", bucket: "shop-assets" }]
                  : []
              }
              onChange={(files) => handleChange("logo_url", files[0]?.url ?? "")}
              hint="Square image recommended (e.g. 200×200px)"
            />
          </div>

          <div>
            <Label className="text-sm mb-1.5 block">Shop Banner (1500×450)</Label>
            <FileUploadDropzone
              bucket="shop-assets"
              folder="banners"
              accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
              acceptedTypes={["image/"]}
              maxSizeMB={5}
              variant="compact"
              value={
                formData.banner_url
                  ? [{ name: "banner", size: 0, type: "image/png", url: formData.banner_url, path: "", bucket: "shop-assets" }]
                  : []
              }
              onChange={(files) => handleChange("banner_url", files[0]?.url ?? "")}
              hint="Recommended: 1500×450px"
            />
            {formData.banner_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formData.banner_url}
                alt="Banner preview"
                className="mt-2 w-full h-24 rounded-lg object-cover border border-gray-200"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
        </div>

        {/* Shop Stats (read-only) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Shop Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-sky-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-sky-600">{shop?.product_count ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Total Products</p>
              </div>
              <div className="bg-sky-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-sky-600">{Number(shop?.rating ?? 0).toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">Shop Rating</p>
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-sm mb-1.5 block text-gray-500">Shop Slug (read-only)</Label>
              <Input value={shop?.slug ?? ""} readOnly className="bg-gray-50 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-sky-500 hover:bg-sky-600 text-white px-8"
        >
          {saving ? <><Loader2 className="size-4 animate-spin mr-2" />Saving...</> : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}