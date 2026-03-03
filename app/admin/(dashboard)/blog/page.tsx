"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type BlogRow = {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  created_at: string;
};

export default function AdminBlogPage() {
  const [items, setItems] = useState<BlogRow[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ search });
    const response = await fetch(`/api/admin/blog?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    setItems(data.items || []);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const createPost = async () => {
    const response = await fetch("/api/admin/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, excerpt: "", imageUrl: "" }),
    });

    if (response.ok) {
      setTitle("");
      setContent("");
      await load();
    }
  };

  const togglePublish = async (item: BlogRow) => {
    const response = await fetch(`/api/admin/blog/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !item.is_published }),
    });
    if (response.ok) await load();
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    if (response.ok) await load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Blog Management</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <Input placeholder="Post title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          className="w-full min-h-28 rounded-md border border-gray-200 p-3 text-sm"
          placeholder="Post content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button onClick={createPost}>Create Draft</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <Input placeholder="Search posts" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500">
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50">
                <td className="px-4 py-3">{item.title}</td>
                <td className="px-4 py-3">{item.slug}</td>
                <td className="px-4 py-3">{item.is_published ? "Published" : "Draft"}</td>
                <td className="px-4 py-3">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => togglePublish(item)}>
                    {item.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(item.id)}>
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
