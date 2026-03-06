"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Package,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type OrderDetail = {
  id: string;
  order_code: string;
  status: string;
  payment_status: string;
  delivery_status: string;
  created_at: string;
  total_amount: number;
  subtotal: number;
  shipping_fee: number;
  discount_amount: number;
  coupon_amount: number;
  tax_amount: number;
  payment_method: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: {
    id: string;
    title: string;
    image_url: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    storehouse_price: number;
    delivery_type: string;
  }[];
  storehouse_total: number;
  profit: number;
};

const paymentOptions = ["Un-Paid", "Paid"];
const deliveryOptions = ["Pending", "Confirmed", "Picked Up", "On The Way", "Delivered"];

const statusColors: Record<string, string> = {
  "Un-Paid": "bg-red-100 text-red-700",
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-amber-100 text-amber-700",
  Confirmed: "bg-blue-100 text-blue-700",
  "Picked Up": "bg-indigo-100 text-indigo-700",
  "On The Way": "bg-sky-100 text-sky-700",
  Delivered: "bg-green-100 text-green-700",
};

export default function SellerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paying, setPaying] = useState(false);

  async function loadOrder() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/seller/orders/${orderId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setOrder(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const updateStatus = async (field: string, value: string) => {
    try {
      const res = await fetch(`/api/seller/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Update failed");
      }
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handlePayStore = async () => {
    setPaying(true);
    setError("");
    try {
      const res = await fetch(`/api/seller/orders/${orderId}/pay-store`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Payment failed");
      setSuccess("Store payment processed successfully!");
      await loadOrder();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-sky-400" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-sky-600 hover:underline">
          <ArrowLeft className="size-4" /> Back to Orders
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/seller/orders" className="p-1.5 rounded-md hover:bg-gray-100">
            <ArrowLeft className="size-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-800">Order Details</h1>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          <CheckCircle className="size-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      {/* Top section: Pay Store + Status + Order Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pay Store Button */}
          <div className="flex items-center justify-center">
            <Button
              onClick={handlePayStore}
              disabled={paying || order.payment_status === "succeeded"}
              className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 text-base font-semibold rounded-md"
            >
              {paying ? (
                <><Loader2 className="size-4 animate-spin mr-2" />Processing...</>
              ) : order.payment_status === "succeeded" ? (
                <><CheckCircle className="size-4 mr-2" />Paid</>
              ) : (
                "Pay Store"
              )}
            </Button>
          </div>

          {/* Payment & Delivery Status Dropdowns */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Payment Status</label>
              <select
                value={order.payment_status === "succeeded" ? "Paid" : "Un-Paid"}
                onChange={(e) => updateStatus("paymentStatus", e.target.value === "Paid" ? "succeeded" : "failed")}
                className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-sky-500 outline-none"
              >
                {paymentOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">Delivery Status</label>
              <select
                value={order.delivery_status.charAt(0).toUpperCase() + order.delivery_status.slice(1).replace(/_/g, " ")}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/ /g, "_");
                  updateStatus("status", val);
                }}
                className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-sky-500 outline-none"
              >
                {deliveryOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Order Info */}
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Order #</span>
              <span className="text-sky-600 font-mono">{order.order_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Order status</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.delivery_status === "pending" ? "Pending" : order.delivery_status.charAt(0).toUpperCase() + order.delivery_status.slice(1)] ?? "bg-gray-100 text-gray-600"}`}>
                {order.delivery_status === "pending" ? "Pending" : order.delivery_status.charAt(0).toUpperCase() + order.delivery_status.slice(1).replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Order date</span>
              <span>{new Date(order.created_at).toLocaleString("en-US", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total amount</span>
              <span className="font-semibold">${order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment method</span>
              <span>{order.payment_method || "Cash on Delivery"}</span>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-600">
          <p className="font-semibold text-gray-800">{order.customer.name}</p>
          {order.customer.email && <p>{order.customer.email}</p>}
          {order.customer.phone && <p>{order.customer.phone}</p>}
          {order.customer.address && <p className="mt-1">{order.customer.address}</p>}
        </div>
      </div>

      {/* Product Items Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Photo</th>
                <th className="text-left px-4 py-3 font-medium">DESCRIPTION</th>
                <th className="text-left px-4 py-3 font-medium">DELIVERY TYPE</th>
                <th className="text-center px-4 py-3 font-medium">QTY</th>
                <th className="text-right px-4 py-3 font-medium">PRICE</th>
                <th className="text-right px-4 py-3 font-medium">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="size-12 bg-gray-100 rounded overflow-hidden relative">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.title} fill sizes="48px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="size-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium max-w-xs">{item.title}</td>
                  <td className="px-4 py-3 text-gray-600">{item.delivery_type || "-"}</td>
                  <td className="px-4 py-3 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">${item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium">${item.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pricing Breakdown */}
        <div className="border-t border-gray-100 px-4 py-4">
          <div className="max-w-xs ml-auto space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Storehouse Price :</span>
              <span className="font-semibold">${order.storehouse_total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Profit :</span>
              <span className="font-semibold">${order.profit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Sub Total :</span>
              <span className="font-semibold">${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Tax :</span>
              <span>${order.tax_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Shipping :</span>
              <span>${order.shipping_fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Coupon :</span>
              <span>${order.coupon_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-800 font-bold">Total :</span>
              <span className="text-lg font-bold">${order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
