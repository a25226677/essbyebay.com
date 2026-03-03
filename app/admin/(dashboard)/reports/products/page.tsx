"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Package, TrendingUp } from "lucide-react";

type ProductReport = {
  id: string;
  title: string;
  total_sold: number;
  revenue: number;
};

type ReportData = {
  topProducts: ProductReport[];
  summary?: { total_orders: number; total_revenue: number; total_products: number };
};

export default function ProductReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports", { cache: "no-store" });
      const json = await res.json();
      setData(json);
    } catch { setData(null); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  const topProducts = data?.topProducts || [];
  const maxRevenue = Math.max(...topProducts.map(p => p.revenue), 1);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Product Report</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analytics and performance of your products</p>
      </div>

      {data?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center"><Package className="size-5 text-indigo-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Products</p>
                <p className="text-lg font-bold">{data.summary.total_products.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><TrendingUp className="size-5 text-emerald-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Orders</p>
                <p className="text-lg font-bold">{data.summary.total_orders.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><BarChart3 className="size-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Revenue</p>
                <p className="text-lg font-bold">${Number(data.summary.total_revenue).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Top Selling Products</h2>
        </div>
        <div className="p-5 space-y-4">
          {topProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Package className="size-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No product data available</p></div>
          ) : topProducts.map((p, i) => (
            <div key={p.id} className="flex items-center gap-4">
              <span className="w-6 text-right text-xs font-bold text-gray-400">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                <p className="text-xs text-gray-500">{p.total_sold} sold &middot; ${Number(p.revenue).toLocaleString()} revenue</p>
              </div>
              <div className="w-40 hidden sm:block">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-500 rounded-full h-2" style={{ width: `${(p.revenue / maxRevenue * 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
