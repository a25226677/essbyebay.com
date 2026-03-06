"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, RefreshCw, MapPin, Phone, User, Calendar,
  CreditCard, Package, CheckCircle2,
  Printer,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

/* ─── Types ─────────────────────────────────────────── */
type Address = {
  id: string; full_name: string; phone: string;
  line_1: string; line_2?: string; city: string;
  state: string; postal_code: string; country: string;
};
type Product = { id: string; title: string; slug: string; image_url: string | null; price: number };
type OrderItem = {
  id: string; quantity: number; unit_price: number; line_total: number;
  products: Product | null;
  profiles: { id: string; full_name: string } | null;
};
type Profile = { id: string; full_name: string; phone: string; avatar_url: string | null };
type Order = {
  id: string; order_code: string; status: string;
  payment_status: string; payment_method: string;
  delivery_status: string; pickup_status: string;
  tracking_code: string | null;
  subtotal: number; shipping_fee: number; discount_amount: number; total_amount: number;
  notes: string | null; created_at: string;
  profiles: Profile | null;
  addresses: Address | null;
  order_items: OrderItem[];
};

/* ─── Constants ─────────────────────────────────────── */
const DELIVERY_OPTIONS = [
  { value: "pending",    label: "Pending" },
  { value: "confirmed",  label: "Confirmed" },
  { value: "picked_up",  label: "Picked Up" },
  { value: "on_the_way", label: "On The Way" },
  { value: "delivered",  label: "Delivered" },
];

const PAYMENT_OPTIONS = [
  { value: "pending",   label: "Un-Paid" },
  { value: "succeeded", label: "Paid" },
  { value: "failed",    label: "Failed" },
  { value: "refunded",  label: "Refunded" },
];

function paymentLabel(status: string) {
  return PAYMENT_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function deliveryLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    teal:   { bg: "#e6fffa", text: "#0d9488" },
    orange: { bg: "#fff3e0", text: "#f97316" },
    red:    { bg: "#fee2e2", text: "#dc2626" },
    blue:   { bg: "#dbeafe", text: "#2563eb" },
    green:  { bg: "#d1fae5", text: "#059669" },
    gray:   { bg: "#f3f4f6", text: "#6b7280" },
  };
  const c = map[color] ?? map.gray;
  return (
    <span className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  );
}

/* ─── Main Component ─────────────────────────────────── */
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [order, setOrder]           = useState<Order | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [paymentStatus, setPaymentStatus]   = useState("");
  const [trackingCode, setTrackingCode]     = useState("");
  const [saveMsg, setSaveMsg]       = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((json) => {
        const o: Order = json.item;
        if (o) {
          setOrder(o);
          setDeliveryStatus(o.delivery_status || "pending");
          setPaymentStatus(o.payment_status || "pending");
          setTrackingCode(o.tracking_code || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!order) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_status: deliveryStatus, payment_status: paymentStatus, tracking_code: trackingCode }),
      });
      if (res.ok) {
        setSaveMsg("Saved successfully!");
        setOrder((prev) => prev ? { ...prev, delivery_status: deliveryStatus, payment_status: paymentStatus, tracking_code: trackingCode || null } : prev);
      } else {
        setSaveMsg("Error saving changes.");
      }
    } catch { setSaveMsg("Error saving changes."); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(""), 3000); }
  };

  const handlePrint = () => {
    if (!order) return;

    const popup = window.open("", "_blank", "width=980,height=780");
    if (!popup) return;

    const itemsRows = (order.order_items || [])
      .map(
        (item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${(item.products?.title || "-").replace(/</g, "&lt;")}</td>
            <td>${item.quantity}</td>
            <td>$${Number(item.unit_price).toFixed(2)}</td>
            <td>$${Number(item.line_total).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${order.order_code}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 0; padding: 24px; }
            .sheet { max-width: 900px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
            .header { background: linear-gradient(90deg, #1f2a44, #2f3b51); color: white; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
            .brand { display: flex; gap: 12px; align-items: center; }
            .brand img { width: 38px; height: 38px; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,0.12); padding: 4px; }
            .brand h1 { margin: 0; font-size: 18px; }
            .muted { color: #6b7280; font-size: 12px; }
            .section { padding: 20px 24px; border-top: 1px solid #f3f4f6; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border-bottom: 1px solid #f3f4f6; padding: 10px 8px; text-align: left; }
            th { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
            .totals { width: 340px; margin-left: auto; margin-top: 12px; }
            .totals .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
            .totals .total { border-top: 1px solid #e5e7eb; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 700; }
            .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #e6fffa; color: #0d9488; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div class="brand">
                <img src="${window.location.origin}/logo.png" alt="StoreBay" />
                <div>
                  <h1>StoreBay Invoice</h1>
                  <div style="font-size:12px;opacity:.85;">Professional sales receipt</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:11px;opacity:.85;">Order Code</div>
                <div style="font-family:monospace;font-size:16px;font-weight:700;">${order.order_code}</div>
              </div>
            </div>

            <div class="section grid">
              <div>
                <div class="muted">Customer</div>
                <div style="font-weight:700; margin-top:4px;">${(order.profiles?.full_name || "-").replace(/</g, "&lt;")}</div>
                <div class="muted" style="margin-top:6px;">${(addrLine || "No shipping address").replace(/</g, "&lt;")}</div>
              </div>
              <div>
                <div class="muted">Order Date</div>
                <div style="font-weight:700; margin-top:4px;">${new Date(order.created_at).toLocaleString()}</div>
                <div style="margin-top:6px;" class="badge">${deliveryLabel(order.delivery_status)}</div>
              </div>
            </div>

            <div class="section">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows || "<tr><td colspan='5' class='muted'>No items found</td></tr>"}
                </tbody>
              </table>

              <div class="totals">
                <div class="row"><span>Subtotal</span><span>$${Number(order.subtotal).toFixed(2)}</span></div>
                <div class="row"><span>Shipping</span><span>$${Number(order.shipping_fee).toFixed(2)}</span></div>
                <div class="row"><span>Discount</span><span>-$${Number(order.discount_amount).toFixed(2)}</span></div>
                <div class="row total"><span>Total</span><span>$${Number(order.total_amount).toFixed(2)}</span></div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function () { window.print(); };
          </script>
        </body>
      </html>`;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
      <RefreshCw className="size-6 animate-spin" /> <span>Loading order…</span>
    </div>
  );

  if (!order) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
      <Package className="size-10 opacity-30" />
      <p>Order not found</p>
      <button onClick={() => router.back()} className="text-sm text-orange-500 hover:underline">Go back</button>
    </div>
  );

  const addr = order.addresses;
  const addrLine = addr
    ? [addr.line_1, addr.line_2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean).join(", ")
    : null;

  const storehousePrice = Number(order.subtotal) * 0.7; // 70% goes to storehouse

  return (
    <div className="space-y-5">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Back + action buttons */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="size-4 text-gray-600" />
          </button>

          <button
            onClick={() => {
              // Free up frozen funds — mark as refunded
              if (!confirm("Free up frozen funds for this order?")) return;
              fetch(`/api/admin/orders/${id}`, {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payment_status: "refunded" }),
              }).then(() => setOrder((prev) => prev ? { ...prev, payment_status: "refunded" } : prev));
            }}
            className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors">
            Free up frozen funds
          </button>

          <StatusBadge
            label={paymentLabel(order.payment_status)}
            color={order.payment_status === "succeeded" ? "green" : order.payment_status === "refunded" ? "blue" : "teal"} />
        </div>

        {/* Right controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Status */}
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer min-w-[130px]">
            {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Delivery Status */}
          <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 cursor-pointer min-w-[150px]">
            {DELIVERY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Tracking Code */}
          <input type="text" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)}
            placeholder="Tracking Code (optional)"
            className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-orange-400 min-w-[180px]" />

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5">
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Save
          </button>

          <button
            onClick={handlePrint}
            className="text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="size-3.5" /> Print
          </button>

          {saveMsg && <span className={`text-xs ${saveMsg.includes("Error") ? "text-red-500" : "text-green-500"}`}>{saveMsg}</span>}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column: QR + Customer ── */}
        <div className="space-y-4">
          {/* QR Code card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-3">
            <div className="w-28 h-28 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
              <QRCodeSVG
                value={`order:${order.order_code}|id:${order.id}`}
                size={96}
                bgColor="#ffffff"
                fgColor="#111827"
                level="H"
                includeMargin
                imageSettings={{
                  src: "/logo.png",
                  x: undefined,
                  y: undefined,
                  height: 20,
                  width: 20,
                  excavate: true,
                }}
              />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 font-medium">Order Code</p>
              <p className="font-mono text-sm font-bold text-gray-800 mt-0.5">{order.order_code}</p>
            </div>
            {order.tracking_code && (
              <div className="text-center">
                <p className="text-xs text-gray-500">Tracking</p>
                <p className="font-mono text-xs text-indigo-600 mt-0.5">{order.tracking_code}</p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2.5">Customer</h3>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <User className="size-4 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{order.profiles?.full_name ?? "—"}</p>
              </div>
            </div>
            {order.profiles?.phone && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone className="size-3.5 text-gray-400 shrink-0" />
                {order.profiles.phone}
              </div>
            )}
            {addrLine && (
              <div className="flex items-start gap-2 text-xs text-gray-600">
                <MapPin className="size-3.5 text-gray-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{addrLine}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Middle + right: Order meta + items ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Meta */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2.5 mb-3">Order Info</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-400 mb-0.5">Order #</p>
                <p className="font-mono font-semibold text-gray-800">{order.order_code}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Order Status</p>
                <StatusBadge
                  label={deliveryLabel(order.delivery_status)}
                  color={order.delivery_status === "delivered" ? "green" : order.delivery_status === "on_the_way" ? "blue" : "orange"} />
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Order Date</p>
                <div className="flex items-center gap-1 text-gray-700">
                  <Calendar className="size-3 text-gray-400" />
                  {new Date(order.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Total Amount</p>
                <p className="font-bold text-gray-900">${Number(order.total_amount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Payment Method</p>
                <div className="flex items-center gap-1 text-gray-700 capitalize">
                  <CreditCard className="size-3 text-gray-400" />
                  {order.payment_method || "online"}
                </div>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Payment Status</p>
                <StatusBadge
                  label={paymentLabel(order.payment_status)}
                  color={order.payment_status === "succeeded" ? "green" : order.payment_status === "refunded" ? "blue" : "red"} />
              </div>
              {order.notes && (
                <div className="col-span-2">
                  <p className="text-gray-400 mb-0.5">Additional Info</p>
                  <p className="text-gray-700">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Order Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["#", "Photo", "Description", "Delivery Type", "QTY", "Price", "Total"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(order.order_items || []).map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex items-center justify-center">
                          {item.products?.image_url ? (
                            <Image src={item.products.image_url} alt={item.products.title || ""}
                              width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <Package className="size-4 text-gray-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                          {item.products?.title ?? "—"}
                        </p>
                        {item.profiles?.full_name && (
                          <p className="text-[11px] text-gray-400 mt-0.5">Seller: {item.profiles.full_name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[11px]">Standard</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-center font-semibold text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900">${Number(item.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Storehouse Price</span>
                <span className="font-semibold text-gray-700">${storehousePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              {Number(order.shipping_fee) > 0 && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Shipping Fee</span>
                  <span>${Number(order.shipping_fee).toFixed(2)}</span>
                </div>
              )}
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Discount</span>
                  <span>-${Number(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${Number(order.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
