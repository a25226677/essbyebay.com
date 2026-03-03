"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Store,
  Package,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Clock,
  RefreshCw,
} from "lucide-react";

type Metrics = {
  customers: number; sellers: number; shops: number;
  products: number; orders: number; totalRevenue: number;
};
type MonthlyPoint = { month: string; revenue: number; orders: number };
type OrderStatus = Record<string, number>;
type RecentOrder = {
  id: string; customer: string; total_amount: number;
  status: string; payment_status: string; created_at: string;
};
type TopProduct = {
  id: string; title: string; price: number; image_url: string | null;
  review_count: number; rating: number; shop: string;
};
type CategoryItem = { id: string; name: string; count: number };
type Analytics = {
  metrics: Metrics; monthlyRevenue: MonthlyPoint[];
  ordersByStatus: OrderStatus; categoryDistribution: CategoryItem[];
  recentOrders: RecentOrder[]; topProducts: TopProduct[];
};

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(0)}`;

const fmtNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", paid: "#3b82f6", processing: "#8b5cf6",
  shipped: "#06b6d4", delivered: "#10b981", cancelled: "#ef4444", refunded: "#6366f1",
};

function StatCard({ label, value, icon: Icon, gradient, sub }: {
  label: string; value: string; icon: React.ElementType; gradient: string; sub?: string;
}) {
  return (
    <div className="relative rounded-2xl p-5 text-white overflow-hidden shadow-lg" style={{ background: gradient }}>
      <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full opacity-20" style={{ background: "rgba(255,255,255,0.4)" }} />
      <div className="absolute -bottom-2 -right-2 w-14 h-14 rounded-full opacity-20" style={{ background: "rgba(255,255,255,0.4)" }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm"><Icon className="size-5" /></div>
          <ArrowUpRight className="size-4 opacity-60 mt-0.5" />
        </div>
        <p className="text-2xl font-extrabold tracking-tight">{value}</p>
        <p className="text-sm font-medium opacity-80 mt-0.5">{label}</p>
        {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#94a3b8";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${color}18`, color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function BarChart({ data }: { data: MonthlyPoint[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end justify-between gap-1.5 h-40 w-full">
      {data.map((d) => {
        const pct = (d.revenue / max) * 100;
        const month = d.month.slice(5);
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="w-full rounded-t-md transition-all duration-300" style={{ height: `${Math.max(4, pct)}%`, background: "linear-gradient(to top, #4f46e5, #818cf8)" }} />
            <span className="text-[10px] text-gray-400">{month}</span>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">{fmt(d.revenue)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/analytics");
      setData(await res.json());
    } catch { setError("Could not load dashboard data."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-500"><RefreshCw className="size-5 animate-spin" /><span className="text-sm">Loading dashboard…</span></div>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-red-500 text-sm">{error || "No data"}</p>
      <button onClick={fetchData} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><RefreshCw className="size-3" /> Retry</button>
    </div>
  );

  const { metrics, monthlyRevenue, ordersByStatus, categoryDistribution, recentOrders, topProducts } = data;
  const totalOrdersByStatus = Object.values(ordersByStatus as Record<string,number>).reduce((s: number, n: number) => s + n, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Welcome back, Admin. Here&apos;s what&apos;s happening.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <StatCard label="Total Revenue" value={fmt(metrics.totalRevenue)} icon={DollarSign} gradient="linear-gradient(135deg,#4f46e5,#7c3aed)" />
        <StatCard label="Total Orders" value={fmtNum(metrics.orders)} icon={ShoppingCart} gradient="linear-gradient(135deg,#0ea5e9,#0284c7)" />
        <StatCard label="Customers" value={fmtNum(metrics.customers)} icon={Users} gradient="linear-gradient(135deg,#10b981,#059669)" />
        <StatCard label="Sellers" value={fmtNum(metrics.sellers)} icon={Store} gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
        <StatCard label="Products" value={fmtNum(metrics.products)} icon={Package} gradient="linear-gradient(135deg,#ec4899,#db2777)" />
        <StatCard label="Active Shops" value={fmtNum(metrics.shops)} icon={TrendingUp} gradient="linear-gradient(135deg,#06b6d4,#0891b2)" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div><h2 className="text-sm font-bold text-gray-800">Revenue Overview</h2><p className="text-xs text-gray-400 mt-0.5">Last 6 months</p></div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">{fmt(metrics.totalRevenue)} Total</span>
          </div>
          <BarChart data={monthlyRevenue.slice(-6)} />
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Order Status</h2>
          <div className="space-y-2.5">
            {Object.entries(ordersByStatus).sort((a,b) => b[1]-a[1]).slice(0,6).map(([status, count]) => {
              const color = STATUS_COLOR[status] ?? "#94a3b8";
              const pct = totalOrdersByStatus > 0 ? (count / totalOrdersByStatus) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: color }} /><span className="capitalize font-medium text-gray-700">{status}</span></div>
                    <span className="font-bold text-gray-900">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">Recent Orders</h2>
            <Link href="/admin/sales" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">View all <ArrowUpRight className="size-3" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Order","Customer","Amount","Status","Date"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8 text-xs">No orders yet</td></tr>
                ) : recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3"><Link href={`/admin/orders/${order.id}`} className="text-indigo-600 hover:underline font-mono text-xs">#{order.id.slice(0,8).toUpperCase()}</Link></td>
                    <td className="px-5 py-3 text-xs text-gray-700 font-medium">{order.customer || "—"}</td>
                    <td className="px-5 py-3 text-xs font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</td>
                    <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap"><Clock className="size-3 inline mr-1" />{new Date(order.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-50">
              <h2 className="text-sm font-bold text-gray-800">Top Products</h2>
              <Link href="/admin/products" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">View all</Link>
            </div>
            <div className="divide-y divide-gray-50">
              {topProducts.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">No products yet</p>
              ) : topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                    ) : <Package className="size-4 text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{p.title}</p>
                    <p className="text-[10px] text-gray-400">{p.shop}</p>
                  </div>
                  <span className="text-xs font-bold text-gray-900 shrink-0">${p.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Categories</h2>
            <div className="space-y-2">
              {categoryDistribution.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">No categories</p>
              ) : categoryDistribution.map((c, i) => {
                const maxCount = Math.max(...categoryDistribution.map((x) => x.count), 1);
                const pct = (c.count / maxCount) * 100;
                const colors = ["#4f46e5","#0ea5e9","#10b981","#f59e0b","#ec4899","#06b6d4"];
                const color = colors[i % colors.length];
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700 truncate">{c.name}</span>
                      <span className="font-bold text-gray-900 ml-2">{c.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
