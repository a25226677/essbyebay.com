"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CreateVirtualSellerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });

  const set = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name || undefined,
          phone: form.phone || undefined,
          role: "seller",
          is_virtual: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create seller");
      toast.success("Virtual seller created successfully");
      router.push("/admin/sellers");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create seller";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/sellers")}
          className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="size-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Virtual Seller</h1>
          <p className="text-xs text-gray-500">Create a seller account managed by admin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full Name</Label>
          <Input id="full_name" placeholder="John Doe" value={form.full_name}
            onChange={e => set("full_name", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
          <Input id="email" type="email" placeholder="seller@example.com" value={form.email}
            onChange={e => set("email", e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" placeholder="+1 234 567 8900" value={form.phone}
            onChange={e => set("phone", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input id="password" type={showPw ? "text" : "password"} placeholder="Min 6 characters"
              value={form.password} onChange={e => set("password", e.target.value)}
              required minLength={6} className="pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/sellers")} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={saving}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
            {saving && <Loader2 className="size-4 mr-1 animate-spin" />}
            Create Seller
          </Button>
        </div>
      </form>
    </div>
  );
}
