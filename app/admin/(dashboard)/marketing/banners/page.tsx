"use client";

import { useCallback, useEffect, useState } from "react";
import { Image as ImageIcon, Plus, Trash2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import NextImage from "next/image";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  position: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export default function BannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", link_url: "", position: "hero", sort_order: 0, is_active: true });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners", { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || data || []);
    } catch { setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFile = (f: File | null) => {
    if (f) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(f.type)) { alert("Only JPEG, PNG, WebP, or GIF images are allowed."); return; }
      if (f.size > 5 * 1024 * 1024) { alert("Image must be under 5MB."); return; }
    }
    setFile(f);
    if (f) { const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f); }
    else setPreview("");
  };

  const uploadImage = async (f: File): Promise<string> => {
    const supabase = createClient();
    const ext = f.name.split(".").pop();
    const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, f, { contentType: f.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    setSaving(true);
    try {
      let image_url = "";
      if (file) image_url = await uploadImage(file);

      const payload: Record<string, unknown> = { ...form };
      if (image_url) payload.image_url = image_url;

      if (editId) {
        await fetch(`/api/admin/banners/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        if (!image_url) { alert("Please upload an image"); setSaving(false); return; }
        payload.image_url = image_url;
        await fetch("/api/admin/banners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      resetForm();
      load();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Error"); } finally { setSaving(false); }
  };

  const resetForm = () => {
    setShowForm(false); setEditId(null); setFile(null); setPreview("");
    setForm({ title: "", link_url: "", position: "hero", sort_order: 0, is_active: true });
  };

  const startEdit = (b: Banner) => {
    setEditId(b.id);
    setForm({ title: b.title, link_url: b.link_url || "", position: b.position, sort_order: b.sort_order, is_active: b.is_active });
    setPreview(b.image_url);
    setShowForm(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage promotional banners</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="size-4" /> Add Banner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold">{editId ? "Edit" : "New"} Banner</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Summer Sale" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Link URL</label>
              <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/flash-deals" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
              <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="hero">Hero</option>
                <option value="sidebar">Sidebar</option>
                <option value="footer">Footer</option>
                <option value="category">Category</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Banner Image</label>
            <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] || null)} className="text-sm" />
            {preview && <div className="mt-2 relative w-48 h-24 rounded-lg overflow-hidden bg-gray-100"><NextImage src={preview} alt="Preview" fill className="object-cover" /></div>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Image</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Position</th>
                <th className="px-4 py-3 text-center">Order</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400"><ImageIcon className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No banners</p></td></tr>
              ) : items.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="w-20 h-10 bg-gray-100 rounded overflow-hidden relative">
                      {b.image_url && <NextImage src={b.image_url} alt={b.title} fill className="object-cover" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{b.position}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{b.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {b.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(b)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="size-4" /></button>
                      <button onClick={() => remove(b.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="size-4" /></button>
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
