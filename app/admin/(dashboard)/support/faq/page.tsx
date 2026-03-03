"use client";

import { useState } from "react";
import { HelpCircle, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function FAQPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", category: "General", sort_order: 0 });

  /* FAQ management - local state for now.
     When a dedicated FAQ API is added, wire up fetch/save/delete. */

  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ question: "", answer: "", category: "General", sort_order: 0 });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">FAQ Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage frequently asked questions</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="size-4" /> Add FAQ
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold">{editId ? "Edit" : "New"} FAQ</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Question</label>
              <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="How do I track my order?" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Answer</label>
              <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="You can track your order by..." rows={4} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option>General</option>
                  <option>Orders</option>
                  <option>Shipping</option>
                  <option>Returns</option>
                  <option>Payments</option>
                  <option>Account</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed">Save FAQ (API Pending)</button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
          </div>
          <p className="text-xs text-amber-600">Note: FAQ functionality requires a dedicated FAQ API endpoint and database table.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="text-center py-16 text-gray-400">
          <HelpCircle className="size-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No FAQs configured</p>
          <p className="text-xs mt-1">Click &quot;Add FAQ&quot; to create your first FAQ entry</p>
        </div>
      </div>
    </div>
  );
}
