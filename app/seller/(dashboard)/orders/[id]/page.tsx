"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Package,
  AlertCircle,
  CheckCircle,
  X,
  Printer,
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
  storehouse_paid: boolean;
  storehouse_amount: number;
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

const statusColors: Record<string, string> = {
  "Un-Paid": "bg-red-100 text-red-700",
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-amber-100 text-amber-700",
  Confirmed: "bg-blue-100 text-blue-700",
  "Picked Up": "bg-indigo-100 text-indigo-700",
  "On The Way": "bg-sky-100 text-sky-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Cancel: "bg-red-100 text-red-700",
};

function deliveryDbToDisplay(dbValue: string): string {
  const map: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    picked_up: "Picked Up",
    on_the_way: "On The Way",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  return map[dbValue] ?? "Pending";
}

function deliveryDisplayToDb(display: string): string {
  const map: Record<string, string> = {
    Pending: "pending",
    Confirmed: "confirmed",
    "Picked Up": "picked_up",
    "On The Way": "on_the_way",
    Delivered: "delivered",
    Cancel: "cancelled",
    Cancelled: "cancelled",
  };
  return map[display] ?? "pending";
}

export default function SellerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paying, setPaying] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [transactionPassword, setTransactionPassword] = useState("");

  async function loadOrder() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/seller/orders/${orderId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setOrder(json);
      // Auto-print if ?print=1 is in the URL
      if (searchParams.get("print") === "1") {
        setTimeout(() => window.print(), 800);
      }
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

  const confirmPayStore = async () => {
    if (!transactionPassword.trim()) {
      setError("Transaction Password is required");
      return;
    }

    if (!/^\d{6}$/.test(transactionPassword.trim())) {
      setError("Transaction password must be exactly 6 digits.");
      return;
    }

    setPaying(true);
    setError("");
    try {
      const res = await fetch(`/api/seller/orders/${orderId}/pay-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionPassword }),
      });
      const json = await res.json();
      
      if (!res.ok) {
        // Handle specific error scenarios with helpful messages
        let errorMessage = json.error || "Payment failed";
        
        if (res.status === 400) {
          // Bad request errors (validation)
          if (errorMessage.includes("Transaction Password is required")) {
            errorMessage = "Password is required. Please enter your transaction password.";
          } else if (errorMessage.includes("exactly 6 digits")) {
            errorMessage = "Transaction password must be exactly 6 digits.";
          } else if (errorMessage.includes("No transaction password configured")) {
            errorMessage = "Transaction password is not configured. Please update it in Settings or contact admin.";
          } else if (errorMessage.includes("already paid")) {
            errorMessage = "This order has already been paid. No further action needed.";
          } else if (errorMessage.includes("Insufficient wallet balance")) {
            errorMessage = errorMessage; // Keep the detailed balance message
          }
        } else if (res.status === 401) {
          // Unauthorized - password mismatch
          setTransactionPassword(""); // Clear the password field
          errorMessage = "Incorrect Transaction Password. Please check and try again.";
        } else if (res.status === 404) {
          errorMessage = "Order not found or you don't have access to this order.";
        } else if (res.status >= 500) {
          errorMessage = "Server error. Please try again in a moment.";
        }
        
        throw new Error(errorMessage);
      }
      
      // Success
      setShowPayModal(false);
      setTransactionPassword("");
      setSuccess("Store payment processed! Pickup status updated to Picked Up.");
      await loadOrder();
      setTimeout(() => setSuccess(""), 6000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Payment failed";
      setError(errorMsg);
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
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/seller/orders" className="p-1.5 rounded-md hover:bg-gray-100">
            <ArrowLeft className="size-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-800">Order Details</h1>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Printer className="size-4" />
          Print Invoice
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm print:hidden">
          <CheckCircle className="size-4 shrink-0" /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm print:hidden">
          <AlertCircle className="size-4 shrink-0" /> {error}
        </div>
      )}

      {/* Top section: Pay Store | Payment Status | Delivery Status | Order Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Col 1: Pay Store + Customer Info */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-start gap-2">
              <Button
                onClick={() => {
                  setShowPayModal(true);
                  setTransactionPassword("");
                  setError("");
                }}
                disabled={order.storehouse_paid}
                className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-2.5 text-sm font-semibold rounded-md print:hidden"
              >
                {order.storehouse_paid ? (
                  <><CheckCircle className="size-4 mr-2" />Store Paid</>
                ) : (
                  "Pay Store"
                )}
              </Button>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${
                  order.storehouse_paid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {order.storehouse_paid ? "Paid" : "Un-Paid"}
              </span>
            </div>
            {/* Customer Info */}
            <div className="text-sm text-gray-600 space-y-0.5">
              <p className="font-semibold text-gray-800">{order.customer.name}</p>
              {order.customer.phone && <p>{order.customer.phone}</p>}
              {order.customer.address && <p className="text-xs text-gray-500 mt-1">{order.customer.address}</p>}
            </div>
          </div>

          {/* Col 2: Payment Status + Delivery Status (Read-only) */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Payment Status</label>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold ${
                    order.payment_status === "succeeded" || order.payment_status === "paid"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {order.payment_status === "succeeded" || order.payment_status === "paid" ? "Paid" : "Un-Paid"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <span className="text-gray-400">Managed by admin only</span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-2 block">Delivery Status</label>
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold ${statusColors[deliveryDbToDisplay(order.delivery_status)] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {deliveryDbToDisplay(order.delivery_status)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <span className="text-gray-400">Managed by admin only</span>
              </p>
            </div>
          </div>

          {/* Col 3: Order Info */}
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between border-b border-gray-50 pb-1">
              <span className="text-gray-500">Order #</span>
              <span className="text-sky-600 font-mono text-xs">{order.order_code}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-1">
              <span className="text-gray-500">Order status</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[deliveryDbToDisplay(order.delivery_status)] ?? "bg-gray-100 text-gray-600"}`}>
                {deliveryDbToDisplay(order.delivery_status)}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-1">
              <span className="text-gray-500">Order date</span>
              <span className="text-xs">{new Date(order.created_at).toLocaleString("en-US", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-1">
              <span className="text-gray-500">Total amount</span>
              <span className="font-semibold">${order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-1">
              <span className="text-gray-500">Payment method</span>
              <span>{order.payment_method || "Cash on Delivery"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Additional Info</span>
              <span className="text-gray-400 text-xs">—</span>
            </div>
          </div>
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

        {/* Print button bottom-right */}
        <div className="flex justify-end pt-3 border-t border-gray-100 mt-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            title="Print Invoice"
          >
            <Printer className="size-4" />
          </button>
        </div>
      </div>

      {/* Pay Store Confirmation Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Payment For Storehouse</h2>
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setTransactionPassword("");
                  setError("");
                }}
                disabled={paying}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-50 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <p className="text-center text-2xl font-bold text-gray-900">
                ${(order.storehouse_amount ?? order.storehouse_total).toFixed(2)}
              </p>
              <p className="text-center text-xs text-gray-600 mt-1">
                Amount to be deducted from wallet
              </p>
            </div>

            <p className="text-center text-xs text-gray-500 leading-relaxed">
              Enter your Transaction Password to confirm and complete the payment. This password is required for security.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="size-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Payment Error</p>
                  <p className="text-xs text-red-700 mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <span>Transaction Password</span>
                {transactionPassword.length > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    transactionPassword.length === 6
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {transactionPassword.length === 6 ? 'Valid' : 'Use 6 digits'}
                  </span>
                )}
              </label>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Enter 6-digit password"
                value={transactionPassword}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setTransactionPassword(digitsOnly);
                  setError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && /^\d{6}$/.test(transactionPassword.trim()) && !paying) {
                    confirmPayStore();
                  }
                }}
                disabled={paying}
                maxLength={6}
                required
                className={`w-full px-4 py-2.5 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 ${
                  error && !transactionPassword.trim()
                    ? 'border-red-300 bg-red-50 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-sky-500'
                } disabled:bg-gray-100 disabled:text-gray-500`}
                autoComplete="off"
              />
              <p className="text-xs text-gray-500 mt-2">
                <span className="block">🔒 Your password is never stored or shared</span>
                <span className="block">📝 {transactionPassword.length}/6 digits</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Forgot transaction password?{" "}
                <Link href="/seller/settings" className="text-sky-600 hover:underline font-medium">
                  Reset from Settings or ask admin
                </Link>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                ℹ️ <strong>Reminder:</strong> This payment will be deducted from your wallet balance and marked as frozen for 24 hours.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPayModal(false);
                  setTransactionPassword("");
                  setError("");
                }}
                disabled={paying}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <Button
                onClick={confirmPayStore}
                disabled={paying || !/^\d{6}$/.test(transactionPassword.trim())}
                className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {paying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
