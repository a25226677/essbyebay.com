"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ShopRow = {
  id: string;
  name: string;
  slug: string;
  is_verified: boolean;
  rating: number;
  product_count: number;
  created_at: string;
};

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ search });
    const response = await fetch(`/api/admin/shops?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    setShops(data.items || []);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleVerify = async (shop: ShopRow) => {
    const response = await fetch(`/api/admin/shops/${shop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !shop.is_verified }),
    });

    if (response.ok) await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Shop Management</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <Input placeholder="Search shops" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="px-4 py-3 text-left">Shop</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Rating</th>
              <th className="px-4 py-3 text-left">Products</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id} className="border-b border-gray-50">
                <td className="px-4 py-3">{shop.name}</td>
                <td className="px-4 py-3">{shop.slug}</td>
                <td className="px-4 py-3">{Number(shop.rating || 0).toFixed(2)}</td>
                <td className="px-4 py-3">{shop.product_count}</td>
                <td className="px-4 py-3">{shop.is_verified ? "Verified" : "Unverified"}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" onClick={() => toggleVerify(shop)}>
                    {shop.is_verified ? "Unverify" : "Verify"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
