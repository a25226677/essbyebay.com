"use client";

import { useState } from "react";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Search, RefreshCw, CheckCircle, Clock, Truck, XCircle } from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  products: { title: string; image_url: string | null; slug: string } | null;
};

type Order = {
  id: string;
  status: string;
  payment_status: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  shipping_address: Record<string, string> | null;
  items: OrderItem[];
};

const STATUS_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     icon: Clock },
  paid:       { label: "Paid",       color: "text-blue-600",    bg: "bg-blue-50 border-blue-200",       icon: CheckCircle },
  processing: { label: "Processing", color: "text-purple-600",  bg: "bg-purple-50 border-purple-200",   icon: RefreshCw },
  shipped:    { label: "Shipped",    color: "text-cyan-600",    bg: "bg-cyan-50 border-cyan-200",       icon: Truck },
  delivered:  { label: "Delivered",  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle },
  cancelled:  { label: "Cancelled",  color: "text-red-600",     bg: "bg-red-50 border-red-200",         icon: XCircle },
  refunded:   { label: "Refunded",   color: "text-gray-600",    bg: "bg-gray-50 border-gray-200",       icon: XCircle },
};

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = orderId.trim();
    if (!id) return;

    setLoading(true);
    setOrder(null);
    setNotFound(false);
    setApiError("");

    try {
      const res = await fetch(`/api/orders/lookup?id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (res.ok && json.order) {
        setOrder(json.order);
      } else if (res.status === 404) {
        setNotFound(true);
      } else {
        setApiError(json.error || "Something went wrong. Please try again.");
      }
    } catch {
      setApiError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const meta = order ? (STATUS_META[order.status] ?? STATUS_META["pending"]) : null;
  const StatusIcon = meta?.icon ?? Clock;
  const currentStep = STATUS_STEPS.indexOf(order?.status ?? "pending");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Track Your Order" }]} />
      <h1 className="text-2xl font-bold mb-1">Track Your Order</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Enter your Order ID to check the current status.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <div className="flex-1">
          <Label htmlFor="orderId" className="sr-only">Order ID</Label>
          <Input
            id="orderId"
            placeholder="Paste your Order ID…"
            value={orderId}
            onChange={(e) => { setOrderId(e.target.value); setNotFound(false); setApiError(""); setOrder(null); }}
            required
            className="h-10"
          />
        </div>
        <Button type="submit" disabled={loading} className="gap-2 shrink-0">
          {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
          Track
        </Button>
      </form>

      {apiError && (
        <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3 text-sm text-red-700 mb-6">
          {apiError}
        </div>
      )}

      {notFound && (
        <div className="border border-gray-100 rounded-lg p-8 text-center">
          <Package size={48} className="mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold mb-1">Order Not Found</h3>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t find an order with ID &ldquo;{orderId}&rdquo;. Please double-check and try again.
          </p>
        </div>
      )}

      {order && meta && (
        <div className="space-y-5">
          <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${meta.bg}`}>
            <StatusIcon size={20} className={meta.color} />
            <div>
              <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
              <p className="text-xs text-muted-foreground">
                Last updated {new Date(order.updated_at).toLocaleString()}
              </p>
            </div>
            <span className="ml-auto text-xs text-muted-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
          </div>

          {!["cancelled", "refunded"].includes(order.status) && (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-100 mx-6 z-0" />
                <div
                  className="absolute left-0 top-4 h-0.5 bg-indigo-500 z-0 transition-all"
                  style={{ width: currentStep >= 0 ? `${(currentStep / (STATUS_STEPS.length - 1)) * 85 + 7.5}%` : "7.5%" }}
                />
                {STATUS_STEPS.map((step, i) => {
                  const done = i <= currentStep;
                  return (
                    <div key={step} className="flex flex-col items-center gap-1.5 z-10 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${done ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-300"}`}>
                        {i + 1}
                      </div>
                      <span className={`text-[10px] text-center capitalize leading-tight ${done ? "text-indigo-600 font-semibold" : "text-gray-400"}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {order.items.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-50">
                <h3 className="text-sm font-semibold text-gray-800">Order Items ({order.items.length})</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    {item.products?.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.products.image_url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Package className="size-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.products?.title || "Product"}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity} × ${Number(item.unit_price).toFixed(2)}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 shrink-0">${Number(item.line_total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Order Summary</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{Number(order.shipping_fee) === 0 ? "Free" : `$${Number(order.shipping_fee).toFixed(2)}`}</span></div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-100 pt-2 mt-2"><span>Total</span><span>${Number(order.total_amount).toFixed(2)}</span></div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Order placed on {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
}
