"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Package, RefreshCw } from "lucide-react";

type Metrics = {
  customers: number; sellers: number; shops: number;
  products: number; orders: number; totalRevenue: number;
  totalCategories: number; totalBrands: number;
};
type CategoryItem = { id: string; name: string; count: number; saleCount: number };
type CategoryStock = { id: string; name: string; stock: number };
type ProductBreakdown = { published: number; sellerProducts: number; adminProducts: number };
type SellerBreakdown = { total: number; approved: number; pending: number };
type TopProduct = {
  id: string; title: string; price: number; image_url: string | null;
  review_count: number; rating: number; shop: string;
};
type Analytics = {
  metrics: Metrics;
  categoryDistribution: CategoryItem[];
  categoryStockDistribution: CategoryStock[];
  productBreakdown: ProductBreakdown;
  sellerBreakdown: SellerBreakdown;
  topProducts: TopProduct[];
};

const fmtNum = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

const fmtStock = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K`
  : String(n);

// Wave SVG for stat card background
function WavePattern({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 300 80"
      className="absolute bottom-0 left-0 w-full"
      preserveAspectRatio="none"
      style={{ height: 60, opacity: 0.25 }}
    >
      <path
        d="M0,40 C40,10 80,70 120,40 C160,10 200,70 240,40 C270,18 290,50 300,35 L300,80 L0,80 Z"
        fill={color}
        opacity="0.6"
      />
      <path
        d="M0,55 C50,30 100,75 150,50 C200,25 250,65 300,45 L300,80 L0,80 Z"
        fill={color}
        opacity="0.4"
      />
    </svg>
  );
}

function StatCard({
  label, sub, value, gradient, waveColor,
}: {
  label: string; sub: string; value: string;
  gradient: string; waveColor: string;
}) {
  return (
    <div
      className="relative rounded-xl p-5 text-white overflow-hidden"
      style={{ background: gradient, minHeight: 120 }}
    >
      <WavePattern color={waveColor} />
      <div className="relative z-10">
        <p className="text-xs font-medium opacity-80 uppercase tracking-wide">{label}</p>
        <p className="text-[10px] opacity-60 mb-2">{sub}</p>
        <p className="text-3xl font-extrabold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

// SVG Donut Chart
function DonutChart({
  title,
  segments,
  legend,
}: {
  title: string;
  segments: { value: number; color: string }[];
  legend: { label: string; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0) || 1;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const arcs = segments.map((seg) => {
    const frac = seg.value / total;
    const dash = frac * circumference;
    const gap = circumference - dash;
    const arc = { offset, dash, gap, color: seg.color };
    offset += dash;
    return arc;
  });

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center">
      <h3 className="text-sm font-bold text-gray-800 mb-3 self-start">{title}</h3>
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx="68" cy="68" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="18" />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx="68" cy="68" r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth="18"
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={-arc.offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "68px 68px" }}
          />
        ))}
      </svg>
      <div className="mt-3 space-y-1 self-start w-full">
        {legend.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
            <span className="text-[11px] text-gray-600 truncate">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Vertical Bar Chart  – matches reference screenshot
const CHART_H = 220; // px height of the bar area
const X_LABEL_H = 80; // px reserved for rotated x-axis labels
const Y_TICKS = 5;

function niceMax(max: number) {
  if (max === 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / exp) * exp;
}

function fmtTick(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function BarChart({
  title,
  data,
  valueFormatter,
  color,
  legendLabel,
}: {
  title: string;
  data: { name: string; value: number }[];
  valueFormatter?: (n: number) => string;
  color: string;
  legendLabel: string;
}) {
  const fmt = valueFormatter ?? String;
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  const rawMax = Math.max(...data.map((d) => d.value), 0);
  const axisMax = niceMax(rawMax);
  const ticks = Array.from({ length: Y_TICKS + 1 }, (_, i) =>
    Math.round((axisMax / Y_TICKS) * (Y_TICKS - i))
  );

  const BAR_MIN_W = 14;
  const BAR_GAP = 4;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-[11px] text-gray-500">{legendLabel}</span>
        </div>
      </div>

      {!hasData ? (
        /* ── Empty state ── */
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400"
          style={{ height: CHART_H + X_LABEL_H }}
        >
          <svg className="size-10 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 17l3-6 4 4 4-8 4 5" />
          </svg>
          <p className="text-sm font-medium">No data available</p>
          <p className="text-xs mt-0.5">Data will appear here once orders are placed</p>
        </div>
      ) : (
        /* ── Chart ── */
        <div className="flex gap-2" style={{ height: CHART_H + X_LABEL_H }}>
          {/* Y-axis labels */}
          <div
            className="flex flex-col justify-between items-end shrink-0 pr-1"
            style={{ height: CHART_H, marginBottom: X_LABEL_H }}
          >
            {ticks.map((t) => (
              <span key={t} className="text-[9px] text-gray-400 leading-none">
                {fmtTick(t)}
              </span>
            ))}
          </div>

          {/* Bars + grid */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Grid + bars */}
            <div
              className="relative flex-1 border-l border-b border-gray-200"
              style={{ height: CHART_H }}
            >
              {/* Horizontal grid lines */}
              {ticks.map((t, i) => (
                <div
                  key={t}
                  className="absolute w-full border-t border-gray-100"
                  style={{ top: `${(i / Y_TICKS) * 100}%` }}
                />
              ))}

              {/* Bars row */}
              <div
                className="absolute inset-0 flex items-end overflow-x-auto"
                style={{ gap: BAR_GAP, paddingLeft: 4, paddingRight: 4 }}
              >
                {data.map((d) => {
                  const pct = axisMax > 0 ? (d.value / axisMax) * 100 : 0;
                  return (
                    <div
                      key={d.name}
                      className="group relative flex flex-col items-center justify-end shrink-0"
                      style={{
                        width: BAR_MIN_W,
                        height: "100%",
                      }}
                    >
                      {/* bar */}
                      <div
                        className="w-full rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${Math.max(pct, d.value > 0 ? 1 : 0)}%`,
                          background: color,
                          minHeight: d.value > 0 ? 3 : 0,
                        }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-20">
                        {fmt(d.value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div
              className="flex overflow-x-auto"
              style={{ height: X_LABEL_H, gap: BAR_GAP, paddingLeft: 4, paddingRight: 4 }}
            >
              {data.map((d) => (
                <div
                  key={d.name}
                  className="shrink-0 flex items-flex-start justify-center pt-1"
                  style={{ width: BAR_MIN_W }}
                >
                  <span
                    className="text-[8px] text-gray-400 leading-tight"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      display: "block",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      maxHeight: X_LABEL_H - 4,
                    }}
                  >
                    {d.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Product Card for Top 12
function ProductCard({ product, index }: { product: TopProduct; index: number }) {
  return (
    <Link
      href={`/admin/products`}
      className="shrink-0 w-44 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="relative h-40 bg-gray-50 overflow-hidden">
        <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center z-10">
          {index + 1}
        </span>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="size-10 text-gray-300" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-semibold text-gray-800 truncate">{product.title}</p>
        <p className="text-xs font-bold text-indigo-600 mt-0.5">${Number(product.price).toFixed(2)}</p>
      </div>
    </Link>
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
      <div className="flex items-center gap-3 text-gray-400">
        <RefreshCw className="size-5 animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-red-500 text-sm">{error || "No data"}</p>
      <button onClick={fetchData} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
        <RefreshCw className="size-3" /> Retry
      </button>
    </div>
  );

  const { metrics, categoryDistribution, categoryStockDistribution, productBreakdown, sellerBreakdown, topProducts } = data;

  const saleChartData = (categoryDistribution || []).map((c) => ({ name: c.name, value: c.saleCount || c.count }));
  const stockChartData = (categoryStockDistribution || []).map((c) => ({ name: c.name, value: c.stock }));

  return (
    <div className="space-y-5">
      {/* Row 1: Stat cards + Donut charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 2×2 Stat cards */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          <StatCard
            label="Total" sub="Customer"
            value={fmtNum(metrics.customers)}
            gradient="linear-gradient(135deg,#7c3aed,#4f46e5)"
            waveColor="#fff"
          />
          <StatCard
            label="Total" sub="Order"
            value={fmtNum(metrics.orders)}
            gradient="linear-gradient(135deg,#0ea5e9,#0284c7)"
            waveColor="#fff"
          />
          <StatCard
            label="Total" sub="Product category"
            value={fmtNum(metrics.totalCategories)}
            gradient="linear-gradient(135deg,#a855f7,#ec4899)"
            waveColor="#fff"
          />
          <StatCard
            label="Total" sub="Product brand"
            value={fmtNum(metrics.totalBrands)}
            gradient="linear-gradient(135deg,#f59e0b,#f97316)"
            waveColor="#fff"
          />
        </div>

        {/* Products donut chart */}
        <div className="lg:col-span-3">
          <DonutChart
            title="Products"
            segments={[
              { value: productBreakdown?.published || metrics.products, color: "#ec4899" },
              { value: productBreakdown?.sellerProducts || 0, color: "#10b981" },
              { value: productBreakdown?.adminProducts || 0, color: "#3b82f6" },
            ]}
            legend={[
              { label: "Total published products", color: "#ec4899" },
              { label: "Total sellers products", color: "#10b981" },
              { label: "Total admin products", color: "#3b82f6" },
            ]}
          />
        </div>

        {/* Sellers donut chart */}
        <div className="lg:col-span-3">
          <DonutChart
            title="Sellers"
            segments={[
              { value: sellerBreakdown?.total || metrics.sellers, color: "#ec4899" },
              { value: sellerBreakdown?.approved || 0, color: "#10b981" },
              { value: sellerBreakdown?.pending || 0, color: "#3b82f6" },
            ]}
            legend={[
              { label: "Total sellers", color: "#ec4899" },
              { label: "Total approved sellers", color: "#10b981" },
              { label: "Total pending sellers", color: "#3b82f6" },
            ]}
          />
        </div>
      </div>

      {/* Row 2: Category wise charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart
          title="Category wise product sale"
          data={saleChartData}
          color="#6366f1"
          legendLabel="Number of sale"
        />
        <BarChart
          title="Category wise product stock"
          data={stockChartData}
          valueFormatter={fmtStock}
          color="#ec4899"
          legendLabel="Number of Stock"
        />
      </div>

      {/* Row 3: Top 12 Products */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">Top 12 Products</h3>
          <Link href="/admin/products" className="text-xs text-indigo-600 hover:underline font-medium">View all</Link>
        </div>
        {topProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 py-12">
            <Package className="size-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">No products yet</p>
            <p className="text-xs mt-0.5">Products will appear here once added</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {topProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

