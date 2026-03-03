"use client";

import { Search, Eye, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

type PaymentItem = {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: string;
};

export default function PaymentHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewPayment, setViewPayment] = useState<PaymentItem | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPayments() {
      setLoading(true);
      const params = new URLSearchParams({ search: searchQuery });
      const response = await fetch(`/api/seller/payments?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!active) return;

      if (response.ok) {
        setPayments(data.items || []);
      } else {
        setPayments([]);
      }
      setLoading(false);
    }

    loadPayments();

    return () => {
      active = false;
    };
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Payment History</h1>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            All Payments
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search..."
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
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Method</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    No payment history found
                  </td>
                </tr>
              ) : (
                payments.map((payment, idx) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-600">{payment.date}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{payment.method}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          payment.status === "Completed"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewPayment(payment)}
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

      {/* Payment Detail Modal */}
      {viewPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setViewPayment(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewPayment(null)} className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100"><X className="size-4" /></button>
            <h3 className="text-lg font-bold mb-4">Payment Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Payment ID</dt><dd className="font-mono text-xs">{viewPayment.id.slice(0,8)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Date</dt><dd>{viewPayment.date}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Amount</dt><dd className="font-semibold">${viewPayment.amount.toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Method</dt><dd>{viewPayment.method}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><span className={`px-2 py-0.5 rounded text-xs font-medium ${viewPayment.status === "Completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{viewPayment.status}</span></dd></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
