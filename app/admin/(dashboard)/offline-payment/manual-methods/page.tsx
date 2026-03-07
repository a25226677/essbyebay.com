"use client";

import React, { useEffect, useState, useRef } from "react";
import { Pencil, Trash2, Plus, ImageIcon, X, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PaymentMethod { id: string; heading: string; logo_url: string | null; is_active: boolean; }

export default function ManualPaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState({ heading: "", logo_url: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string, ok = true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000); };

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/offline-payment/manual-methods");
      const json = await res.json();
      setMethods(json.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchMethods(); }, []);

  const openAdd = () => { setEditing(null); setForm({heading:"",logo_url:""}); setShowModal(true); };
  const openEdit = (m: PaymentMethod) => { setEditing(m); setForm({heading:m.heading,logo_url:m.logo_url||""}); setShowModal(true); };

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      notify("Only JPEG, PNG, WebP, or GIF images are allowed", false);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notify("Image must be under 5MB", false);
      return;
    }

    setUploadingLogo(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        notify("Please login again before uploading", false);
        return;
      }

      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/payment-methods/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);

      setForm((prev) => ({ ...prev, logo_url: publicUrl }));
      notify("Logo uploaded");
    } catch (err) {
      notify(`Upload failed: ${err instanceof Error ? err.message : "Unknown error"}`, false);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!form.heading.trim()) return notify("Heading required", false);
    setSaving(true);
    try {
      const method = editing ? "PATCH" : "POST";
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch("/api/admin/offline-payment/manual-methods", {
        method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      notify(editing ? "Updated" : "Added");
      setShowModal(false);
      fetchMethods();
    } catch { notify("Error saving", false); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payment method?")) return;
    try {
      await fetch(`/api/admin/offline-payment/manual-methods?id=${id}`, { method: "DELETE" });
      notify("Deleted");
      fetchMethods();
    } catch { notify("Error", false); }
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg ${toast.ok?"bg-green-500":"bg-red-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{background:"#06b6d4"}}>
          <Plus className="size-4" /> Add New Payment Method
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Manual Payment Method</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium w-12">#</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Heading</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Logo</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-medium">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 text-sm">Loading…</td></tr>
              ) : methods.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No payment methods</td></tr>
              ) : methods.map((m, i) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-4 py-3 text-gray-500 text-xs">{i+1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{m.heading}</td>
                  <td className="px-4 py-3">
                    {m.logo_url ? (
                      <img src={m.logo_url} alt={m.heading} className="h-10 w-16 object-contain rounded border border-gray-100" />
                    ) : (
                      <div className="h-10 w-16 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                        <ImageIcon className="size-4 text-gray-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={()=>openEdit(m)} className="p-1.5 rounded-md border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600">
                        <Pencil className="size-3.5" />
                      </button>
                      <button onClick={()=>handleDelete(m.id)} className="p-1.5 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">{editing?"Edit Payment Method":"Add New Payment Method"}</h3>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="size-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Heading *</label>
                <input value={form.heading} onChange={e=>setForm(f=>({...f,heading:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="e.g. Bank, USDT-TRC20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Logo URL</label>
                <div className="flex items-center gap-2">
                  <input value={form.logo_url} onChange={e=>setForm(f=>({...f,logo_url:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  placeholder="https://..." />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                  >
                    {uploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    {uploadingLogo ? "Uploading" : "Upload"}
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    handleLogoUpload(e.target.files?.[0] ?? null);
                    e.currentTarget.value = "";
                  }}
                />
                {form.logo_url && (
                  <img src={form.logo_url} alt="Preview" className="mt-2 h-12 w-24 object-contain rounded border border-gray-100" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg disabled:opacity-60">
                {saving?"Saving…":"Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
