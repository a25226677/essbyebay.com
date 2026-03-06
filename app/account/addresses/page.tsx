"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, MapPin, Trash2, RefreshCw, Edit2 } from "lucide-react";
import { toast } from "sonner";

interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  line_1: string;
  line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const emptyAddress = {
  label: "Home",
  full_name: "",
  phone: "",
  line_1: "",
  line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

export default function AddressesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyAddress);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/users/login?next=/account/addresses");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "admin") {
        router.replace("/admin/dashboard");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      if (loadError) {
        setError(loadError.message || "Failed to load addresses");
        setAddresses([]);
        return;
      }

      setAddresses(data || []);
    } catch {
      setError("Failed to load addresses. Please try again.");
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  const handleSave = async () => {
    if (!form.full_name || !form.line_1 || !form.city || !form.state || !form.postal_code) return;
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      router.replace("/users/login?next=/account/addresses");
      return;
    }

    const record = {
      user_id: user.id,
      label: form.label || "Home",
      full_name: form.full_name,
      phone: form.phone,
      line_1: form.line_1,
      line_2: form.line_2 || null,
      city: form.city,
      state: form.state,
      postal_code: form.postal_code,
      country: form.country || "US",
    };

    if (editId) {
      const { error: updateError } = await supabase.from("addresses").update(record).eq("id", editId);
      if (updateError) {
        setError(updateError.message || "Failed to update address");
        setSaving(false);
        return;
      }
      toast.success("Address updated");
    } else {
      const { error: insertError } = await supabase.from("addresses").insert(record);
      if (insertError) {
        setError(insertError.message || "Failed to save address");
        setSaving(false);
        return;
      }
      toast.success("Address saved");
    }

    setShowForm(false);
    setEditId(null);
    setForm(emptyAddress);
    setSaving(false);
    loadAddresses();
  };

  const handleDelete = async (id: string) => {
    const { error: deleteError } = await supabase.from("addresses").delete().eq("id", id);
    if (deleteError) {
      toast.error(deleteError.message || "Failed to delete address");
      return;
    }
    toast.success("Address deleted");
    loadAddresses();
  };

  const startEdit = (addr: Address) => {
    setForm({
      label: addr.label,
      full_name: addr.full_name,
      phone: addr.phone,
      line_1: addr.line_1,
      line_2: addr.line_2 || "",
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
    });
    setEditId(addr.id);
    setShowForm(true);
  };

  const setDefault = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Remove default from all
    const { error: resetError } = await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    if (resetError) {
      toast.error(resetError.message || "Failed to set default address");
      return;
    }
    // Set new default
    const { error: setErrorValue } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    if (setErrorValue) {
      toast.error(setErrorValue.message || "Failed to set default address");
      return;
    }
    toast.success("Default address updated");
    loadAddresses();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Account", href: "/account" }, { label: "Addresses" }]} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="text-xl font-bold">My Addresses</h1>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => { setForm(emptyAddress); setEditId(null); setShowForm(true); }} className="gap-1">
            <Plus className="size-4" /> Add Address
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white border rounded-lg p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-sm">{editId ? "Edit Address" : "New Address"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} placeholder="Home, Work..." />
            </div>
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Address Line 1 *</Label>
            <Input value={form.line_1} onChange={(e) => setForm((p) => ({ ...p, line_1: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Address Line 2</Label>
            <Input value={form.line_2} onChange={(e) => setForm((p) => ({ ...p, line_2: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>State *</Label>
              <Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP *</Label>
              <Input value={form.postal_code} onChange={(e) => setForm((p) => ({ ...p, postal_code: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} placeholder="US" />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-1">
              {saving && <RefreshCw className="size-4 animate-spin" />}
              {editId ? "Update" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
          </div>
        </div>
      )}

      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-12 bg-white border rounded-lg">
          <MapPin className="size-10 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No saved addresses yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="bg-white border rounded-lg p-4 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{addr.label}</span>
                  {addr.is_default && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium uppercase">Default</span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{addr.full_name}</p>
                <p className="text-xs text-gray-500">{addr.line_1}{addr.line_2 ? `, ${addr.line_2}` : ""}</p>
                <p className="text-xs text-gray-500">{addr.city}, {addr.state} {addr.postal_code}</p>
                {addr.phone && <p className="text-xs text-gray-400 mt-1">{addr.phone}</p>}
              </div>
              <div className="flex gap-1 ml-2">
                {!addr.is_default && (
                  <button onClick={() => setDefault(addr.id)} className="text-xs text-primary hover:underline px-2 py-1">Set Default</button>
                )}
                <button onClick={() => startEdit(addr)} className="p-1.5 rounded hover:bg-gray-100">
                  <Edit2 className="size-3.5 text-gray-500" />
                </button>
                <button onClick={() => handleDelete(addr.id)} className="p-1.5 rounded hover:bg-gray-100">
                  <Trash2 className="size-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
