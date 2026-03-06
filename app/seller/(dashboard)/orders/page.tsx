"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Eye, X } from "lucide-react";

type OrderItem = {
  id: string;
  code: string;
  num_products: number;
  customer: string;
  amount: number;
  profit: number;
  pickupStatus: string;
  deliveryStatus: string;
  paymentStatus: string;
  date: string;
};

type Stats = {
  totalOrders: number;
  totalTurnover: number;
  totalProfit: number;
};

export default function OrdersPage() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalTurnover: 0, totalProfit: 0 });
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(
    async (search: string, payment: string, delivery: string) => {
      setLoading(true);
      const params = new URLSearchParams({ search, payment_status: payment, delivery_status: delivery });
      const res = await fetch(`/api/seller/orders?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setOrders(data.items || []);
        setStats(data.stats || { totalOrders: 0, totalTurnover: 0, totalProfit: 0 });
      } else {
        setOrders([]);
        setStats({ totalOrders: 0, totalTurnover: 0, totalProfit: 0 });
      }
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    fetchOrders(searchQuery, paymentFilter, deliveryFilter);
  }, [fetchOrders, searchQuery, paymentFilter, deliveryFilter]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") setSearchQuery(searchInput);
  };

  const cancelOrder = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    const res = await fetch(`/api/seller/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (res.ok) fetchOrders(searchQuery, paymentFilter, deliveryFilter);
  };

  const statCards = [
    { label: "Total orders", value: stats.totalOrders.toString() },
    { label: "Total Turnover", value: `$${stats.totalTurnover.toFixed(2)}` },
    { label: "Total Profit", value: `$${stats.totalProfit.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-6 text-white text-center"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)" }}
          >
            <div className="flex justify-center mb-3">
              <div className="w-10 h-10 rounded-full border-2 border-white/50 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm text-white/80 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Orders</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="all">Filter by Payment Status</option>
              <option value="Paid">Paid</option>
              <option value="Un-Paid">Un-Paid</option>
            </select>
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="all">Filter by Deliver Status</option>
              <option value="Pending">Pending</option>
              <option value="On Delivery">On Delivery</option>
              <option value="Delivered">Delivered</option>
            </select>
            <input
              type="text"
              placeholder="Type Order code & hit Enter"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 w-56"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Order Code:</th>
                <th className="text-left px-4 py-3 font-medium">Num. of Products</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Profit</th>
                <th className="text-left px-4 py-3 font-medium">Pick Up Status</th>
                <th className="text-left px-4 py-3 font-medium">Delivery Status</th>
                <th className="text-left px-4 py-3 font-medium">Payment Status</th>
                <th className="text-right px-4 py-3 font-medium">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <ShoppingCart className="size-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-500 font-medium">No orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sky-600 font-medium cursor-pointer hover:underline"
                        onClick={() => router.push(`/seller/orders/${order.id}`)}
                      >
                        {order.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{order.num_products}</td>
                    <td className="px-4 py-3 text-gray-700">{order.customer}</td>
                    <td className="px-4 py-3 text-gray-700">${order.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700">${order.profit.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold text-white ${
                          order.pickupStatus === "Picked Up" ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {order.pickupStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{order.deliveryStatus}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold text-white ${
                          order.paymentStatus === "Paid" ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => router.push(`/seller/orders/${order.id}`)}
                          className="w-8 h-8 flex items-center justify-center rounded border border-sky-300 text-sky-500 hover:bg-sky-50 transition-colors"
                          title="View"
                        >
                          <Eye className="size-4" />
                        </button>
                        {order.pickupStatus === "Unpicked Up" && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            className="w-8 h-8 flex items-center justify-center rounded border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
                            title="Cancel"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
