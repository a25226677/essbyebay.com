"use client";

import { useState } from "react";
import {
  ShoppingCart,
  Search,
  Eye,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect } from "react";

type OrderItem = {
  id: string;
  code: string;
  customer: string;
  amount: number;
  deliveryStatus: string;
  paymentStatus: string;
  date: string;
};

const statusColors: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Delivered: "bg-green-100 text-green-700",
  "On delivery": "bg-sky-100 text-sky-700",
  Cancelled: "bg-red-100 text-red-700",
  Paid: "bg-green-100 text-green-700",
  Unpaid: "bg-red-100 text-red-700",
};

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState<OrderItem | null>(null);

  const tabs = [
    { label: "All", value: "all" },
    { label: "Pending", value: "Pending" },
    { label: "On Delivery", value: "On delivery" },
    { label: "Delivered", value: "Delivered" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchQuery,
        status: activeTab,
      });
      const response = await fetch(`/api/seller/orders?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!active) return;

      if (response.ok) {
        setOrders(data.items || []);
      } else {
        setOrders([]);
      }
      setLoading(false);
    }

    loadOrders();
    return () => {
      active = false;
    };
  }, [searchQuery, activeTab]);

  const nextDeliveryStatus = (status: string) => {
    if (status === "Pending") return "processing";
    if (status === "Processing") return "shipped";
    if (status === "On delivery") return "delivered";
    return null;
  };

  const togglePaymentStatus = (status: string) =>
    status === "Paid" ? "failed" : "succeeded";

  const updateOrder = async (id: string, updates: Record<string, string>) => {
    const response = await fetch(`/api/seller/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      const params = new URLSearchParams({
        search: searchQuery,
        status: activeTab,
      });
      const fresh = await fetch(`/api/seller/orders?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await fresh.json();
      if (fresh.ok) setOrders(data.items || []);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Orders</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab.value
                ? "bg-sky-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            Order List
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search by order code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">Order Code</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">
                  Delivery Status
                </th>
                <th className="text-left px-4 py-3 font-medium">
                  Payment Status
                </th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-right px-4 py-3 font-medium">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <ShoppingCart className="size-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-500 font-medium">
                      No orders found
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-sky-600 font-medium">
                      {order.code}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {order.customer}
                    </td>
                    <td className="px-4 py-3 text-gray-700">${order.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          const next = nextDeliveryStatus(order.deliveryStatus);
                          if (next) updateOrder(order.id, { status: next });
                        }}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          statusColors[order.deliveryStatus] || ""
                        }`}
                      >
                        {order.deliveryStatus}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateOrder(order.id, {
                            paymentStatus: togglePaymentStatus(order.paymentStatus),
                          })
                        }
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          statusColors[order.paymentStatus] || ""
                        }`}
                      >
                        {order.paymentStatus}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{order.date}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewOrder(order)}
                        className="size-7 rounded-full bg-sky-50 text-sky-600 inline-flex items-center justify-center hover:bg-sky-100"
                      >
                        <Eye className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewOrder(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewOrder(null)} className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100"><X className="size-4" /></button>
            <h3 className="text-lg font-bold mb-4">Order Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Order Code</dt><dd className="font-mono text-sky-600">{viewOrder.code}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Customer</dt><dd>{viewOrder.customer}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Amount</dt><dd className="font-semibold">${viewOrder.amount.toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Delivery Status</dt><dd><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[viewOrder.deliveryStatus] || ""}`}>{viewOrder.deliveryStatus}</span></dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Payment Status</dt><dd><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[viewOrder.paymentStatus] || ""}`}>{viewOrder.paymentStatus}</span></dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Date</dt><dd>{viewOrder.date}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
