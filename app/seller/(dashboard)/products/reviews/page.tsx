"use client";

import { useEffect, useState } from "react";
import { Frown, RefreshCw, Star } from "lucide-react";

type Review = {
  id: string;
  product: string;
  customer: string;
  rating: number;
  comment: string;
  date: string;
};

export default function ProductReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/seller/reviews", { cache: "no-store" });
        const data = await res.json();
        setReviews(data.reviews || []);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Product Reviews</h1>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg">
            <Star className="size-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{avgRating}</span>
            <span className="text-xs text-amber-600">({reviews.length} reviews)</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left px-6 py-4 font-medium w-12">#</th>
                <th className="text-left px-6 py-4 font-medium">Product</th>
                <th className="text-left px-6 py-4 font-medium">Customer</th>
                <th className="text-left px-6 py-4 font-medium">Rating</th>
                <th className="text-left px-6 py-4 font-medium">Comment</th>
                <th className="text-left px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <RefreshCw className="size-6 animate-spin text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Loading reviews...</p>
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <Frown className="size-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-500 font-medium">
                      No reviews yet
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Reviews will appear here when customers review your products.</p>
                  </td>
                </tr>
              ) : (
                reviews.map((review, idx) => (
                  <tr
                    key={review.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-6 py-4 text-gray-500">{idx + 1}</td>
                    <td className="px-6 py-4 text-gray-800 font-medium max-w-[200px] truncate">
                      {review.product}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {review.customer}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3.5 ${
                              i < review.rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                      {review.comment || "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {review.date}
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
