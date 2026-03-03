"use client";

import { useEffect, useState } from "react";
import { Search, Frown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type CommissionItem = {
  id: string;
  index: number;
  orderCode: string;
  grossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  sellerEarning: number;
  date: string;
  status: string;
};

const statusColors: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-amber-100 text-amber-700",
};

export default function CommissionHistoryPage() {
  const [items, setItems] = useState<CommissionItem[]>([]);
  const [totals, setTotals] = useState({ totalEarned: 0, totalCommission: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/seller/commission", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        setItems(json.items ?? []);
        setTotals({ totalEarned: json.totalEarned ?? 0, totalCommission: json.totalCommission ?? 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = search
    ? items.filter((i) => i.orderCode.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Commission History</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Summary cards */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-sky-500 text-white rounded-xl p-5">
            <p className="text-sm opacity-80">Total Earned</p>
            <p className="text-2xl font-bold mt-1">${totals.totalEarned.toFixed(2)}</p>
          </div>
          <div className="bg-orange-500 text-white rounded-xl p-5">
            <p className="text-sm opacity-80">Total Commission Paid</p>
            <p className="text-2xl font-bold mt-1">${totals.totalCommission.toFixed(2)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">All Commission Records</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search by order code..."
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
                <th className="text-left px-4 py-3 font-medium">Order Code</th>
                <th className="text-left px-4 py-3 font-medium">Gross</th>
                <th className="text-left px-4 py-3 font-medium">Commission ({"{"}%{"}"})</th>
                <th className="text-left px-4 py-3 font-medium">Admin Commission</th>
                <th className="text-left px-4 py-3 font-medium">Seller Earning</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
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
                    <p className="text-xl text-gray-500 font-medium">No commission records</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500">{item.index}</td>
                    <td className="px-4 py-3 text-sky-600 font-medium">{item.orderCode}</td>
                    <td className="px-4 py-3 text-gray-700">${item.grossAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{item.commissionRate}%</td>
                    <td className="px-4 py-3 text-red-500">-${item.commissionAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium text-green-600">${item.sellerEarning.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{item.date}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {item.status}
                      </span>
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
