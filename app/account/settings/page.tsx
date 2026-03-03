"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, RefreshCw } from "lucide-react";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/users/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      setForm({
        full_name: profile?.full_name || user.user_metadata?.full_name || "",
        email: user.email || "",
        phone: profile?.phone || "",
      });
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update profile table
      const { error: profErr } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name.trim(), phone: form.phone.trim() })
        .eq("id", user.id);

      if (profErr) {
        setError(profErr.message);
        return;
      }

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: form.full_name.trim() },
      });

      setSuccess("Profile updated successfully!");
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
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
      <BreadcrumbNav items={[{ label: "Account", href: "/account" }, { label: "Profile Settings" }]} />

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-xl font-bold">Profile Settings</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 mb-4">{success}</div>}

      <div className="bg-white border rounded-lg p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={form.email} disabled className="bg-gray-50" />
          <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Your phone number" />
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
