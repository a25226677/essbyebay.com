"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ArrowLeft, Heart, RefreshCw, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

interface WishlistItem {
  id: string;
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    image_url: string | null;
  } | null;
}

type RawWishlistRow = {
  id: string;
  product:
    | {
        id: string;
        title: string;
        slug: string;
        price: number;
        image_url: string | null;
      }
    | Array<{
        id: string;
        title: string;
        slug: string;
        price: number;
        image_url: string | null;
      }>
    | null;
};

export default function WishlistPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/users/login?next=/account/wishlist");
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
        .from("wishlists")
        .select("id, product:products(id, title, slug, price, image_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (loadError) {
        setError(loadError.message || "Failed to load wishlist");
        setItems([]);
        return;
      }

      const normalized: WishlistItem[] = ((data as RawWishlistRow[] | null) || []).map((row) => {
        const product = Array.isArray(row.product) ? (row.product[0] ?? null) : row.product;
        return {
          id: row.id,
          product,
        };
      });

      setItems(normalized);
    } catch {
      setError("Failed to load wishlist. Please try again.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id: string) => {
    const { error: deleteError } = await supabase.from("wishlists").delete().eq("id", id);
    if (deleteError) {
      toast.error(deleteError.message || "Failed to remove item");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Removed from wishlist");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Account", href: "/account" }, { label: "Wishlist" }]} />

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-xl font-bold">Wishlist</h1>
        <span className="text-sm text-muted-foreground">({items.length})</span>
        <button
          onClick={load}
          className="ml-1 p-2 rounded-lg hover:bg-gray-100"
          title="Refresh wishlist"
        >
          <RefreshCw className="size-4 text-gray-500" />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white border rounded-lg">
          <Heart className="size-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm mb-1">Your wishlist is empty</p>
          <p className="text-xs text-gray-400">
            Browse products and tap the heart icon to save items here
          </p>
          <Link href="/" className="inline-block mt-4 text-sm text-primary hover:underline">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const p = item.product;
            if (!p) return null;
            return (
              <div key={item.id} className="bg-white border rounded-lg p-3 flex gap-3 items-center">
                <Link href={`/product/${p.slug}`} className="shrink-0">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.title} width={72} height={72} className="rounded object-cover" />
                  ) : (
                    <div className="w-[72px] h-[72px] bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No img</div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${p.slug}`} className="text-sm font-medium hover:text-primary line-clamp-2">
                    {p.title}
                  </Link>
                  <p className="text-sm font-semibold text-primary mt-1">${p.price.toFixed(2)}</p>
                </div>
                <button onClick={() => handleRemove(item.id)} className="p-2 rounded hover:bg-gray-100 shrink-0">
                  <Trash2 className="size-4 text-red-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
