"use client";

import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, ShoppingCart, DollarSign, Package } from "lucide-react";

type ReportData = {
  monthlyRevenue: { month: string; revenue: number; orders: number }[];
  ordersByStatus: Record<string, number>;
  topProducts: { id: string; title: string; image_url: string | null; total_sold: number; revenue: number }[];
  newSellers: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", paid: "#3b82f6", processing: "#8b5cf6",
  shipped: "#06b6d4", delivered: "#10b981", cancelled: "#ef4444", refunded: "#6366f1",
};

function BarChart({ data }: { data: { label: string; value: number; max: number }[] }) {
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full rounded-t-md bg-indigo-500 transition-all" style={{ height: d.max > 0 ? (d.value / d.max * 112) + "px" : "4px", minHeight: "4px", opacity: 0.65 + (i / (data.length || 1)) * 0.35 }} />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchData = async () => {
    setLoading(true);
    try { const r = await fetch("/api/admin/reports"); const j = await r.json(); setData(j); } catch {} finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCw className="size-5 animate-spin text-indigo-400" /><span className="ml-3 text-sm text-gray-500">Loading report…</span></div>;
  if (!data) return null;
  const maxRevenue = Math.max(...data.monthlyRevenue.map((m) => m.revenue), 1);
  const chartData = data.monthlyRevenue.map((m) => ({ label: m.month.slice(5), value: m.revenue, max: maxRevenue }));
  const kpis = [
    { label: "Total Revenue", value: "$" + Number(data.totalRevenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), icon: DollarSign, color: "from-indigo-500 to-purple-600" },
    { label: "Total Orders", value: data.totalOrders.toLocaleString(), icon: ShoppingCart, color: "from-sky-500 to-blue-600" },
    { label: "Avg Order Value", value: "$" + Number(data.avgOrderValue).toFixed(2), icon: TrendingUp, color: "from-emerald-500 to-green-600" },
    { label: "New Sellers (30d)", value: data.newSellers.toLocaleString(), icon: Package, color: "from-amber-500 to-orange-500" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-gray-900">Reports &amp; Analytics</h1><p className="text-xs text-gray-500 mt-0.5">Last 12 months overview</p></div>
        <button onClick={fetchData} className="text-xs border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1"><RefreshCw className={"size-3.5 " + (loading ? "animate-spin" : "")} /> Refresh</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className={"w-10 h-10 rounded-xl bg-gradient-to-br " + k.color + " flex items-center justify-center mb-3"}><k.icon className="size-5 text-white" /></div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Monthly Revenue (12 months)</h2>
        <BarChart data={chartData} />
        <div className="mt-3 grid grid-cols-6 lg:grid-cols-12 gap-2 pt-3 border-t border-gray-50">
          {data.monthlyRevenue.map((m, i) => (
            <div key={i} className="text-center">
              <p className="text-xs font-bold text-gray-700">{(m.revenue / 1000).toFixed(1)}k</p>
              <p className="text-[10px] text-gray-400">{m.orders} ord</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Orders by Status</h2>
          <div className="space-y-2.5">
            {Object.entries(data.ordersByStatus).map(([st, count]) => {
              const total = Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              const color = STATUS_COLOR[st] || "#94a3b8";
              return (
                <div key={st} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-24 capitalize shrink-0">{st}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="h-2 rounded-full" style={{ width: pct + "%", background: color }} /></div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Top Products</h2>
          <div className="space-y-3">
            {data.topProducts.slice(0, 8).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-indigo-500 w-5 shrink-0">#{i + 1}</span>
                {p.image_url
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0" />
                  : <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{p.title}</p>
                  <p className="text-[11px] text-gray-400">{p.total_sold} sold · {Number(p.revenue).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
