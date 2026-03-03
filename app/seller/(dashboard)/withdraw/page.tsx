"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Frown, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type WithdrawItem = {
  id: string;
  index: number;
  date: string;
  amount: number;
  method: string;
  status: string;
  notes?: string;
};

const statusColors: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Completed: "bg-green-100 text-green-700",
  Approved: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function MoneyWithdrawPage() {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<WithdrawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/withdraw", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setBalance(json.balance);
      setHistory(json.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const handleWithdraw = async () => {
    setError("");
    setSuccess("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/seller/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, method }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setSuccess("Withdrawal request submitted successfully!");
      setAmount("");
      await loadData();
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = search
    ? history.filter(
        (h) =>
          h.method.toLowerCase().includes(search.toLowerCase()) ||
          h.status.toLowerCase().includes(search.toLowerCase()),
      )
    : history;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Money Withdraw</h1>

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

      {/* Balance + Withdraw Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-sky-500 text-white rounded-xl p-6">
          <p className="text-sm opacity-80">Available Balance</p>
          {loading ? (
            <div className="h-8 w-32 bg-sky-400 rounded-md animate-pulse mt-1" />
          ) : (
            <p className="text-3xl font-bold mt-1">
              ${balance.toFixed(2)}
            </p>
          )}
          <p className="text-xs opacity-70 mt-1">After pending withdrawals</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <div>
            <Label className="text-sm mb-1.5 block">Withdraw Amount ($)</Label>
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder={`Max $${balance.toFixed(2)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">Payment Method</Label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-md text-sm outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option>Bank Transfer</option>
              <option>PayPal</option>
              <option>Wise</option>
              <option>Payoneer</option>
            </select>
          </div>
          <Button
            onClick={handleWithdraw}
            disabled={submitting || loading}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white"
          >
            {submitting ? <><Loader2 className="size-4 animate-spin mr-2" />Requesting...</> : "Request Withdrawal"}
          </Button>
        </div>
      </div>

      {/* Withdraw History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Withdraw History</h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Loader2 className="size-8 animate-spin text-sky-400 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <Frown className="size-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-xl text-gray-500 font-medium">No withdrawal requests</p>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-500">{item.index}</td>
                    <td className="px-4 py-3 text-gray-600">{item.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">${item.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{item.method}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[item.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {item.status}
                      </span>
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