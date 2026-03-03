"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Frown, Package, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type StorehouseItem = {
  id: string;
  index: number;
  title: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
  image: string | null;
  category: string;
  reason: "Inactive" | "Out of Stock";
};

const reasonColors: Record<string, string> = {
  Inactive: "bg-gray-100 text-gray-600",
  "Out of Stock": "bg-red-100 text-red-600",
};

export default function ProductStorehousePage() {
  const [items, setItems] = useState<StorehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/seller/storehouse", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setItems(json.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = search
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.sku.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Product Storehouse</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            Inactive / Out-of-Stock Products{" "}
            {!loading && <span className="text-gray-400 font-normal">({items.length})</span>}
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Stock</th>
                <th className="text-left px-4 py-3 font-medium">Reason</th>
                <th className="text-right px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Loader2 className="size-8 animate-spin text-sky-400 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Frown className="size-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-500 font-medium">
                      {items.length === 0 ? "No inactive or out-of-stock products" : "No results for your search"}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500">{item.index}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 bg-gray-100 rounded-lg overflow-hidden shrink-0 relative">
                          {item.image ? (
                            <Image src={item.image} alt={item.title} fill sizes="40px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="size-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-gray-800 line-clamp-2 max-w-[200px]">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-3 text-gray-600">{item.category}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">${item.price.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${item.stock === 0 ? "text-red-500" : "text-gray-700"}`}>{item.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${reasonColors[item.reason] ?? "bg-gray-100 text-gray-600"}`}>
                        {item.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/seller/products/${item.id}/edit`} className="text-xs text-sky-600 hover:underline font-medium">Edit</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
