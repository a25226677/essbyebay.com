"use client";

import { useState } from "react";
import { Search, ArrowRightLeft, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const transfers = [
  { id: "TRF-001", product: "Wireless Headphones Pro", from: "Main Warehouse", to: "Store A", qty: 10, date: "Feb 28, 2026", status: "Completed" },
  { id: "TRF-002", product: "Smart Watch Series 5", from: "Store B", to: "Main Warehouse", qty: 5, date: "Feb 27, 2026", status: "Pending" },
  { id: "TRF-003", product: "Running Shoes X1", from: "Main Warehouse", to: "Store B", qty: 15, date: "Feb 26, 2026", status: "Completed" },
  { id: "TRF-004", product: "Leather Wallet Premium", from: "Store A", to: "Main Warehouse", qty: 8, date: "Feb 25, 2026", status: "In Transit" },
];

export default function StockTransfersPage() {
  const [search, setSearch] = useState("");

  const filtered = transfers.filter(t =>
    t.product.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ArrowRightLeft className="size-5" /> Stock Transfers
        </h1>
        <Button size="sm" className="gap-2"><Plus className="size-4" /> New Transfer</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input placeholder="Search transfers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-3 text-left">Transfer ID</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-left">To</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{t.id}</td>
                  <td className="px-4 py-3 text-xs font-medium text-gray-800">{t.product}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.from}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.to}</td>
                  <td className="px-4 py-3 text-xs text-right font-semibold">{t.qty}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      t.status === "Completed" ? "bg-green-100 text-green-700" :
                      t.status === "Pending" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
