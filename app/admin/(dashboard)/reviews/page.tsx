"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Star, Trash2, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
type Review = { id: string; rating: number; comment: string | null; created_at: string; products: { title: string } | null; profiles: { full_name: string } | null; };
type Pagination = { page: number; limit: number; total: number; pages: number };
function Stars({ n }: { n: number }) {
  return <span className="flex">{[1,2,3,4,5].map(i => <Star key={i} className={"size-3.5 " + (i <= n ? "fill-amber-400 text-amber-400" : "text-gray-200")} />)}</span>;
}
export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination>({page:1,limit:20,total:0,pages:1});
  const [loading, setLoading] = useState(true); const [page, setPage] = useState(1);
  const loadReviews = useCallback(async (pg?: number) => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(pg ?? page), limit: "20" });
    try {
      const r = await fetch("/api/admin/reviews?" + p);
      const j = await r.json();
      setReviews(j.items || []);
      setPagination(j.pagination || {page:1,limit:20,total:0,pages:1});
    } catch {} finally { setLoading(false); }
  }, [page]);
  useEffect(() => { loadReviews(); }, [loadReviews]);
  const deleteReview = async (id: string) => {
    await fetch("/api/admin/reviews?id=" + id, { method: "DELETE" });
    loadReviews();
  };
  const hp = (pg: number) => { setPage(pg); loadReviews(pg); };
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Reviews</h1><p className="text-xs text-gray-500 mt-0.5">{pagination.total.toLocaleString()} reviews</p></div>
        <button onClick={() => loadReviews()} className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> Refresh</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><RefreshCw className="size-5 animate-spin text-indigo-400" /><span className="ml-3 text-sm text-gray-500">Loading…</span></div>
        : reviews.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3"><MessageSquare className="size-10 opacity-30" /><p className="text-sm">No reviews found</p></div>
        : <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-gray-50 bg-gray-50/50">{["Customer","Product","Rating","Comment","Date",""].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-50">{reviews.map((rv) => (
            <tr key={rv.id} className="hover:bg-gray-50/50 group">
              <td className="px-5 py-3.5 text-xs font-medium text-gray-800">{rv.profiles?.full_name || "—"}</td>
              <td className="px-5 py-3.5 text-xs text-gray-600 max-w-[180px] truncate">{rv.products?.title || "—"}</td>
              <td className="px-5 py-3.5"><Stars n={rv.rating} /></td>
              <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[240px] truncate">{rv.comment || <span className="text-gray-300 italic">No comment</span>}</td>
              <td className="px-5 py-3.5 text-xs text-gray-400">{new Date(rv.created_at).toLocaleDateString()}</td>
              <td className="px-5 py-3.5"><button onClick={() => deleteReview(rv.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-all"><Trash2 className="size-4"/></button></td>
            </tr>
          ))}</tbody>
        </table></div>}
        {pagination.pages>1 && <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50"><span className="text-xs text-gray-500">Showing {(page-1)*pagination.limit+1}–{Math.min(page*pagination.limit,pagination.total)} of {pagination.total}</span><div className="flex items-center gap-1"><button onClick={()=>hp(page-1)} disabled={page<=1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="size-4 text-gray-600"/></button>{Array.from({length:Math.min(5,pagination.pages)},(_,i)=>{const pg=Math.max(1,Math.min(page-2,pagination.pages-4))+i;return <button key={pg} onClick={()=>hp(pg)} className={"w-7 h-7 text-xs rounded-lg font-medium "+(pg===page?"bg-indigo-600 text-white":"hover:bg-gray-100 text-gray-600")}>{pg}</button>;})}<button onClick={()=>hp(page+1)} disabled={page>=pagination.pages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="size-4 text-gray-600"/></button></div></div>}
      </div>
    </div>
  );
}
