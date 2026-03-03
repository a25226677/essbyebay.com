"use client";

import { useState } from "react";
import { Tag, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function CouponsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 0,
    max_uses: 100,
    expires_at: "",
  });
  /* Coupons don't have a dedicated API yet, showing a management UI scaffold.
     When the API is added, wire this up similarly to other pages. */

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Coupons</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage discount coupons</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="size-4" /> Add Coupon
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold">New Coupon</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Coupon Code</label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Discount Type</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Discount Value</label>
              <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Order Amount</label>
              <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Uses</label>
              <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expires At</label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed">Save Coupon (API Pending)</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
          </div>
          <p className="text-xs text-amber-600">Note: Coupon functionality requires a dedicated coupons API endpoint and database table.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Min Order</th>
                <th className="px-4 py-3 text-center">Uses</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <Tag className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No coupons yet</p>
                  <p className="text-xs mt-1">Create your first coupon to get started</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
