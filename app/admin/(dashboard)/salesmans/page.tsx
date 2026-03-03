"use client";

import { useState } from "react";
import { Search,  Plus, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const salesmans = [
  { id: "SM001", name: "Alex Turner", email: "alex.t@company.com", phone: "+1 234-111-2222", assignedSeller: "Tech Store", sales: 82, commission: 5, earnings: "$623.00", joined: "Feb 2025", status: "Active" },
  { id: "SM002", name: "Jordan Lee", email: "jordan.l@company.com", phone: "+1 234-111-3333", assignedSeller: "Fashion Hub", sales: 55, commission: 6, earnings: "$394.20", joined: "Apr 2025", status: "Active" },
  { id: "SM003", name: "Casey Brown", email: "casey.b@company.com", phone: "+1 234-111-4444", assignedSeller: "Sports Plus", sales: 31, commission: 5, earnings: "$215.75", joined: "Jul 2025", status: "Active" },
  { id: "SM004", name: "Morgan White", email: "morgan.w@company.com", phone: "+1 234-111-5555", assignedSeller: "Home Essentials", sales: 0, commission: 5, earnings: "$0.00", joined: "Jan 2026", status: "Inactive" },
];

export default function SalesmansPage() {
  const [search, setSearch] = useState("");

  const filtered = salesmans.filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.assignedSeller.toLowerCase().includes(search.toLowerCase())
  );

  const totalEarnings = salesmans.reduce((sum, s) => sum + parseFloat(s.earnings.replace("$", "").replace(",", "")), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Salesmans</h1>
        <Button size="sm" className="gap-2"><Plus className="size-4" /> Add Salesman</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Total Salesmans", value: salesmans.length },
          { label: "Active", value: salesmans.filter(s => s.status === "Active").length },
          { label: "Total Commissions Paid", value: `$${totalEarnings.toFixed(2)}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input placeholder="Search salesmans..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-4 py-3 text-left">Salesman</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Assigned Seller</th>
                <th className="px-4 py-3 text-right">Total Sales</th>
                <th className="px-4 py-3 text-right">Commission %</th>
                <th className="px-4 py-3 text-right">Earnings</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                        <p className="text-[10px] text-gray-400">{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-gray-600">{s.email}</p>
                    <p className="text-[10px] text-gray-400">{s.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-indigo-600">{s.assignedSeller}</td>
                  <td className="px-4 py-3 text-xs text-right font-semibold">{s.sales}</td>
                  <td className="px-4 py-3 text-xs text-right text-blue-600 font-semibold">{s.commission}%</td>
                  <td className="px-4 py-3 text-xs text-right font-semibold text-green-700">{s.earnings}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.joined}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 flex gap-1">
                    <button className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Edit</button>
                    <button className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center gap-0.5">
                      <DollarSign className="size-2.5" />Pay
                    </button>
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
