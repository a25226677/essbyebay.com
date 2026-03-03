"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Store, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";

export default function BecomeSellerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasShop, setHasShop] = useState(false);

  const [form, setForm] = useState({
    shopName: "",
    email: "",
    phone: "",
    description: "",
  });

  // Check if user already has a shop or needs to login
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) {
        router.push("/users/login?next=/shop/create");
        return;
      }
      // Check if already has a shop
      const { data: existing } = await supabase
        .from("shops")
        .select("id, name")
        .eq("owner_id", data.session.user.id)
        .maybeSingle();

      if (existing) {
        setHasShop(true);
      }
      setChecking(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.shopName.trim()) {
      setError("Shop name is required");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/users/login?next=/shop/create");
        return;
      }

      // Generate slug from shop name
      const slug = form.shopName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        + "-" + Date.now().toString(36);

      // Update user role to seller
      const { error: roleErr } = await supabase
        .from("profiles")
        .update({ role: "seller", phone: form.phone || undefined })
        .eq("id", user.id);

      if (roleErr) {
        setError("Failed to update your account role. " + roleErr.message);
        setLoading(false);
        return;
      }

      // Create the shop
      const { error: shopErr } = await supabase
        .from("shops")
        .insert({
          owner_id: user.id,
          name: form.shopName,
          slug,
          description: form.description || null,
        });

      if (shopErr) {
        // If shop creation fails (e.g. unique constraint), try to restore role
        if (shopErr.message.includes("unique") || shopErr.message.includes("duplicate")) {
          setError("You already have a shop or this shop name is taken.");
        } else {
          setError("Failed to create shop: " + shopErr.message);
        }
        setLoading(false);
        return;
      }

      // Send emails (non-blocking via API)
      try {
        await fetch("/api/shop/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopName: form.shopName,
            sellerName: user.user_metadata?.full_name || form.email,
            sellerEmail: user.email || form.email,
          }),
        });
      } catch {
        // Email failure is not critical
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <RefreshCw className="size-6 animate-spin text-indigo-400 mx-auto" />
        <p className="text-sm text-gray-500 mt-3">Checking your account...</p>
      </div>
    );
  }

  if (hasShop) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Store className="size-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">You Already Have a Shop</h1>
        <p className="text-muted-foreground text-sm mb-6">
          You can manage your shop from the seller dashboard.
        </p>
        <Button onClick={() => router.push("/seller/dashboard")}>
          Go to Seller Dashboard
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="size-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Application Submitted!</h1>
        <p className="text-muted-foreground text-sm mb-2">
          Your shop <strong>{form.shopName}</strong> has been created successfully.
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          You can now access your seller dashboard and start adding products. Our team will review and verify your shop shortly.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push("/seller/dashboard")}>
            Go to Seller Dashboard
          </Button>
          <Button variant="outline" onClick={() => router.push("/seller/products/new")}>
            Add Your First Product
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Become a Seller" }]} />
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
          <Store className="size-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Become a Seller</h1>
          <p className="text-muted-foreground text-sm">
            Join thousands of sellers and reach customers worldwide.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-6 flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        <div className="space-y-2">
          <Label htmlFor="shopName">Shop Name *</Label>
          <Input
            id="shopName"
            placeholder="Your shop name"
            value={form.shopName}
            onChange={(e) => setForm(p => ({ ...p, shopName: e.target.value }))}
            required
          />
          <p className="text-xs text-muted-foreground">This will be your public shop name visible to customers.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Contact Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={form.phone}
            onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Tell us about your business</Label>
          <textarea
            id="description"
            rows={4}
            placeholder="Describe what you sell and your business model..."
            value={form.description}
            onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <><RefreshCw className="size-4 animate-spin mr-2" /> Creating Your Shop...</>
          ) : (
            "Submit Application"
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          By submitting, you agree to our seller terms and commission policies.
        </p>
      </form>
    </div>
  );
}
