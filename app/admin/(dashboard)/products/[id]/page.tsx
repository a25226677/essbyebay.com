/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";

type Category = { id: string; name: string };
type Brand = { id: string; name: string };

type ProductItem = {
  id: string;
  title: string;
  slug: string;
  sku: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock_count: number;
  image_url: string | null;
  category_id: string | null;
  brand_id: string | null;
  is_active: boolean;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params?.id;
  const supabase = useMemo(() => createClient(), []);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    sku: "",
    description: "",
    price: "",
    compare_at_price: "",
    stock_count: "0",
    category_id: "",
    brand_id: "",
    is_active: true,
  });

  useEffect(() => {
    if (!productId) return;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [cats, brs, productRes] = await Promise.all([
          fetch("/api/admin/categories", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/admin/brands", { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/admin/products/${productId}`, { cache: "no-store" }),
        ]);

        setCategories(cats.items || []);
        setBrands(brs.items || []);

        const productJson = await productRes.json();
        if (!productRes.ok) {
          setError(productJson.error || "Failed to load product");
          setLoading(false);
          return;
        }

        const product: ProductItem = productJson.item;
        setForm({
          title: product.title || "",
          slug: product.slug || "",
          sku: product.sku || "",
          description: product.description || "",
          price: String(product.price ?? ""),
          compare_at_price:
            product.compare_at_price !== null && product.compare_at_price !== undefined
              ? String(product.compare_at_price)
              : "",
          stock_count: String(product.stock_count ?? 0),
          category_id: product.category_id || "",
          brand_id: product.brand_id || "",
          is_active: Boolean(product.is_active),
        });
        setImageUrl(product.image_url || "");
      } catch {
        setError("Failed to load product details");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [productId]);

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && typeof value === "string") {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setError("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(filePath);

      setImageUrl(publicUrl);
    } catch (err) {
      setError(`Image upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl("");
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Product title is required");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setError("Valid price is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug || slugify(form.title),
        sku: form.sku.trim() || null,
        description: form.description.trim() || null,
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        stock_count: Number(form.stock_count) || 0,
        category_id: form.category_id || null,
        brand_id: form.brand_id || null,
        image_url: imageUrl || null,
        is_active: form.is_active,
      };

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product");

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-72 flex items-center justify-center text-gray-500 gap-2">
        <Loader2 className="size-5 animate-spin" /> Loading product...
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="size-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-sm text-gray-500">Update product details</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Product name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <Input value={form.slug} onChange={(e) => updateField("slug", e.target.value)} placeholder="auto-generated" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <Input value={form.sku} onChange={(e) => updateField("sku", e.target.value)} placeholder="Optional SKU" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock Count</label>
              <Input type="number" min="0" value={form.stock_count} onChange={(e) => updateField("stock_count", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Product description..."
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
              <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => updateField("price", e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compare At Price</label>
              <Input type="number" step="0.01" min="0" value={form.compare_at_price} onChange={(e) => updateField("compare_at_price", e.target.value)} placeholder="Original price (optional)" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Organization</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => updateField("category_id", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <select
                value={form.brand_id}
                onChange={(e) => updateField("brand_id", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => updateField("is_active", e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">Product is active and visible</label>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Product Image</h2>
          {imagePreview || imageUrl ? (
            <div className="relative w-40 h-40">
              <img src={imagePreview || imageUrl} alt="Preview" className="w-full h-full object-cover rounded-xl border border-gray-200" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
              >
                <X className="size-3" />
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                  <Loader2 className="size-6 text-indigo-600 animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
              <Upload className="size-8 text-gray-300 mb-2" />
              <span className="text-sm text-gray-500">Click to upload image</span>
              <span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP up to 5MB</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving...
              </>
            ) : (
              "Update Product"
            )}
          </Button>
          <Link href="/admin/products">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
