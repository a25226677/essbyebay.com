"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, ArrowLeft, Save } from "lucide-react";

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dbCategories, setDbCategories] = useState<{id:string;name:string}[]>([]);
  const [dbBrands, setDbBrands] = useState<{id:string;name:string}[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "0",
    stock_count: "0",
    sku: "",
    image_url: "",
    is_active: true,
    category_name: "",
    brand_name: "",
  });

  useEffect(() => {
    fetch("/api/admin/categories").then(r => r.json()).then(d => setDbCategories(d.items || [])).catch(() => {});
    fetch("/api/admin/brands").then(r => r.json()).then(d => setDbBrands(d.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const res = await fetch(`/api/seller/products/${productId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setError("Failed to load product");
          setLoading(false);
          return;
        }
        const data = await res.json();
        const p = data.item || data;
        setForm({
          title: p.title || "",
          description: p.description || "",
          price: String(p.price || 0),
          stock_count: String(p.stock_count || 0),
          sku: p.sku || "",
          image_url: p.image_url || "",
          is_active: p.is_active ?? true,
          category_name: p.categories?.name || "",
          brand_name: p.brands?.name || "",
        });
      } catch {
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    }
    if (productId) loadProduct();
  }, [productId]);

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Product name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/seller/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: Number(form.price),
          stockCount: Number(form.stock_count),
          sku: form.sku || null,
          imageUrl: form.image_url || null,
          isActive: form.is_active,
          categoryName: form.category_name || null,
          brandName: form.brand_name || null,
        }),
      });

      if (res.ok) {
        setSuccess("Product updated successfully!");
        setTimeout(() => router.push("/seller/products"), 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update product");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="size-6 animate-spin text-sky-400" />
        <span className="ml-3 text-sm text-gray-500">Loading product...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="size-9 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="size-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Edit Product</h1>
          <p className="text-xs text-gray-500">Update product details</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Product Name *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Product title"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={5}
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            placeholder="Product description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">Stock Quantity</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              value={form.stock_count}
              onChange={(e) => setForm((p) => ({ ...p, stock_count: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={form.category_name}
              onChange={(e) => setForm((p) => ({ ...p, category_name: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select Category</option>
              {dbCategories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand">Brand</Label>
            <select
              id="brand"
              value={form.brand_name}
              onChange={(e) => setForm((p) => ({ ...p, brand_name: e.target.value }))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select Brand</option>
              {dbBrands.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              placeholder="Optional SKU"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              value={form.image_url}
              onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Published (visible to customers)</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
