"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Eye,
  Star,
  PlusCircle,
  ArrowUpRight,
  Wallet,
  Settings,
  CreditCard,
  PackagePlus,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

type DashboardData = {
  shop: { id: string; name: string; is_verified: boolean; product_count: number; logo_url: string | null } | null;
  stats: { productCount: number; balance: number; totalOrders: number; totalSales: number };
  orders: { newOrder: number; cancelled: number; onDelivery: number; delivered: number };
  categoryProducts: { name: string; count: number }[];
  salesData: { month: string; amount: number }[];
  currentMonthSales: number;
  lastMonthSales: number;
  topProducts: { id: string; name: string; price: string; image: string | null; rating: number }[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value || 0);
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ""}`} />;
}

// ─────────────────────────────────────────────────────────────────────
// Dashboard component — real data only, no dummy values
// ─────────────────────────────────────────────────────────────────────
export default function SellerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productSlide, setProductSlide] = useState(0);

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/dashboard", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load dashboard");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDashboard(); }, []);

  const topProducts = data?.topProducts ?? [];
  const maxSlide = Math.max(0, topProducts.length - 4);
  const maxSales = Math.max(...(data?.salesData.map((d) => d.amount) ?? [1]), 1);

  const statCards = data
    ? [
        { label: "Products", value: data.stats.productCount.toLocaleString(), icon: Package, color: "bg-sky-500", extra: true },
        { label: "Total Shop Balance", value: formatCurrency(data.stats.balance), icon: DollarSign, color: "bg-green-500" },
        { label: "Total Orders", value: data.stats.totalOrders.toLocaleString(), icon: ShoppingCart, color: "bg-sky-400" },
        { label: "Total Sales", value: formatCurrency(data.stats.totalSales), icon: TrendingUp, color: "bg-sky-600" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>
        <button
          onClick={loadDashboard}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`${stat.color} text-white rounded-xl p-5 flex items-center justify-between`}>
                  <div>
                    <p className="text-sm font-medium opacity-90">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    {stat.extra && (
                      <div className="flex items-center gap-3 mt-2 text-xs opacity-80">
                        <span className="flex items-center gap-1"><Eye className="size-3" /> Active</span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="size-3" /> {data?.shop?.is_verified ? "Verified" : "Pending"}
                        </span>
                      </div>
                    )}
                  </div>
                  <Icon className="size-10 opacity-30" />
                </div>
              );
            })}
      </div>

      {/* ── Middle Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Stat */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-sky-600 mb-4">Sales Stat</h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4" />)}</div>
          ) : (
            <>
              <div className="flex items-end gap-1.5 h-32">
                {(data?.salesData ?? []).map((d) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full bg-sky-400 rounded-t-sm transition-all duration-500"
                      style={{ height: `${(d.amount / maxSales) * 100}%`, minHeight: "4px" }}
                    />
                    <span className="text-[10px] text-gray-400">{d.month}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-sky-600">Sold Amount</h4>
                <p className="text-xs text-gray-500 mt-1">Current month</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(data?.currentMonthSales ?? 0)}</p>
                <p className="text-xs text-gray-500 mt-1">Last Month: {formatCurrency(data?.lastMonthSales ?? 0)}</p>
              </div>
            </>
          )}
        </div>

        {/* Category wise product count */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-sky-600 mb-4">Category wise product count</h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5" />)}</div>
          ) : (data?.categoryProducts ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No products yet</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1 scrollbar-hide">
              {(data?.categoryProducts ?? []).map((cat, idx) => (
                <div key={`${cat.name}-${idx}`} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-sky-600 hover:underline cursor-pointer truncate mr-2">{cat.name}</span>
                  <span className="text-gray-600 font-medium shrink-0">{cat.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Orders + Verified */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-sky-600 mb-1">Orders</h3>
            <p className="text-xs text-gray-500 mb-4">All time summary</p>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "New / Processing", value: data?.orders.newOrder ?? 0, icon: PlusCircle },
                  { label: "Cancelled", value: data?.orders.cancelled ?? 0, icon: ShoppingCart },
                  { label: "On Delivery", value: data?.orders.onDelivery ?? 0, icon: ArrowUpRight },
                  { label: "Delivered", value: data?.orders.delivered ?? 0, icon: Package },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-sky-50 flex items-center justify-center">
                        <Icon className="size-4 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="text-lg font-bold text-sky-600">{item.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-center">
            {loading ? (
              <Skeleton className="size-16 rounded-full" />
            ) : (
              <div className="text-center">
                <ShieldCheck className={`size-16 mx-auto ${data?.shop?.is_verified ? "text-green-500" : "text-gray-300"}`} />
                <p className={`text-sm font-semibold mt-2 ${data?.shop?.is_verified ? "text-green-600" : "text-gray-400"}`}>
                  {data?.shop?.is_verified ? "VERIFIED" : "PENDING VERIFICATION"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Money Withdraw", icon: Wallet, href: "/seller/withdraw" },
          { label: "Add New Product", icon: PackagePlus, href: "/seller/products/new" },
          { label: "Shop Settings", icon: Settings, href: "/seller/settings", button: "Go to settings" },
          { label: "Payment History", icon: CreditCard, href: "/seller/payments", button: "View History" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow"
            >
              <Icon className="size-10 text-sky-500 mb-3" />
              <p className="text-sm font-semibold text-gray-700">{card.label}</p>
              {card.button && (
                <span className="mt-3 px-4 py-1.5 bg-sky-500 text-white text-xs font-medium rounded-md">
                  {card.button}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── Top Products ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-sky-600">
            Top Products {!loading && `(${topProducts.length})`}
          </h3>
          <Link href="/seller/products" className="text-xs text-sky-600 hover:underline">View All →</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : topProducts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">
            No products yet.{" "}
            <Link href="/seller/products/new" className="text-sky-600 underline">Add your first product</Link>
          </p>
        ) : (
          <div className="relative">
            <div className="overflow-hidden">
              <div className="flex gap-4 transition-transform duration-300" style={{ transform: `translateX(-${productSlide * 180}px)` }}>
                {topProducts.map((product) => (
                  <div key={product.id} className="shrink-0 w-[160px]">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2 relative">
                      {product.image ? (
                        <Image src={product.image} alt={product.name} fill sizes="160px" className="object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="size-8 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-bold text-red-500">{product.price}</p>
                    <div className="flex gap-0.5 my-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`size-3 ${i < product.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{product.name}</p>
                  </div>
                ))}
              </div>
            </div>
            {maxSlide > 0 && (
              <>
                <button onClick={() => setProductSlide(Math.max(0, productSlide - 1))} className="absolute left-0 top-1/3 -translate-y-1/2 -translate-x-3 size-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center hover:bg-gray-50">
                  <ChevronLeft className="size-4 text-gray-600" />
                </button>
                <button onClick={() => setProductSlide(Math.min(maxSlide, productSlide + 1))} className="absolute right-0 top-1/3 -translate-y-1/2 translate-x-3 size-8 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center hover:bg-gray-50">
                  <ChevronRight className="size-4 text-gray-600" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
 