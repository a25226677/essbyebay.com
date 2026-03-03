"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link: string;
  button_text: string;
  sort_order: number;
  is_active: boolean;
};

export default function AdminBannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("/search");

  const load = async () => {
    const response = await fetch("/api/admin/banners", { cache: "no-store" });
    const data = await response.json();
    setItems(data.items || []);
  };

  useEffect(() => {
    load();
  }, []);

  const addBanner = async () => {
    const response = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, imageUrl, link, buttonText: "Shop Now", sortOrder: items.length + 1 }),
    });

    if (response.ok) {
      setTitle("");
      setImageUrl("");
      setLink("/search");
      await load();
    }
  };

  const toggle = async (item: Banner) => {
    const response = await fetch(`/api/admin/banners/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.is_active }),
    });

    if (response.ok) await load();
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    if (response.ok) await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Banner Management</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4 grid md:grid-cols-4 gap-3">
        <Input placeholder="Banner title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <Input placeholder="Link" value={link} onChange={(e) => setLink(e.target.value)} />
        <Button onClick={addBanner}>Add Banner</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Link</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50">
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3 truncate max-w-[300px]">{item.image_url}</td>
                <td className="px-4 py-3">{item.link}</td>
                <td className="px-4 py-3">{item.is_active ? "Active" : "Disabled"}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => toggle(item)}>
                    Toggle
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => remove(item.id)}>
                    Delete
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
