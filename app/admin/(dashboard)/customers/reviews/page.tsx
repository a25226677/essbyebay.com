"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPagination } from "@/components/admin/pagination";
import { Star, Trash2 } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  products: { id: string; title: string; slug: string; image_url: string | null } | null;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
};
type Pagination = { page: number; limit: number; total: number; pages: number };

export default function CustomerReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?page=${page}&limit=20`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 0 });
    } catch { setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const removeReview = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
    load(pagination.page);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Customer Reviews</h1>
        <p className="text-sm text-gray-500 mt-0.5">{pagination.total} reviews</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Rating</th>
                <th className="px-4 py-3 text-left">Comment</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400"><Star className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No reviews found</p></td></tr>
              ) : items.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.profiles?.full_name || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{r.products?.title || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-3.5 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />)}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[300px] truncate">{r.comment || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeReview(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="size-4 text-red-400" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={pagination.page} pages={pagination.pages} total={pagination.total} onPageChange={(p) => load(p)} />
      </div>
    </div>
  );
}
