/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Pencil, Trash2, X, Loader2, Upload, Tag } from "lucide-react";

type Brand = { id: string; name: string; slug: string; logo_url: string | null; created_at: string };

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function BrandsPage() {
  const [items, setItems] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formLogo, setFormLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/brands?${params}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(() => load(), 300); return () => clearTimeout(t); }, [load]);

  const openAdd = () => { setEditingId(null); setFormName(""); setFormSlug(""); setFormLogo(""); setError(""); setShowForm(true); };

  const openEdit = (b: Brand) => { setEditingId(b.id); setFormName(b.name); setFormSlug(b.slug); setFormLogo(b.logo_url || ""); setError(""); setShowForm(true); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `brands/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setFormLogo(publicUrl);
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!formName.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = { name: formName.trim(), slug: formSlug || slugify(formName) };
      if (formLogo) payload.logo_url = formLogo;

      const url = editingId ? `/api/admin/brands/${editingId}` : "/api/admin/brands";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand?")) return;
    await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} brands</p>
        </div>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Plus className="size-4" /> Add Brand</Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{editingId ? "Edit Brand" : "New Brand"}</h2>
            <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="size-4 text-gray-500" /></button>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <Input value={formName} onChange={(e) => { setFormName(e.target.value); if (!editingId) setFormSlug(slugify(e.target.value)); }} placeholder="Brand name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="auto-generated" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
            <div className="flex items-center gap-3">
              {formLogo ? (
                <div className="relative w-16 h-16">
                  <img src={formLogo} alt="" className="w-full h-full object-contain rounded-lg border bg-white p-1" />
                  <button onClick={() => setFormLogo("")} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X className="size-3" /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 text-sm text-gray-500">
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {uploading ? "Uploading..." : "Upload logo"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : editingId ? "Update" : "Create"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input placeholder="Search brands..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Brand</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-16 text-gray-400"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-16 text-gray-400"><Tag className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No brands found</p></td></tr>
              ) : items.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-white shrink-0 border border-gray-100 p-0.5">
                        {b.logo_url ? <img src={b.logo_url} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded"><Tag className="size-4 text-gray-300" /></div>}
                      </div>
                      <span className="font-medium text-gray-900">{b.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{b.slug}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Edit"><Pencil className="size-4 text-gray-400" /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="size-4 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
