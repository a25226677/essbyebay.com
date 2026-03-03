"use client";

import { useState } from "react";
import { Truck, Plus, Trash2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";

type ShippingMethod = {
  id: string;
  name: string;
  description: string;
  base_cost: number;
  per_kg_cost: number;
  min_days: number;
  max_days: number;
  is_active: boolean;
};

const defaultMethods: ShippingMethod[] = [
  { id: "standard", name: "Standard Shipping", description: "Delivered in 5-7 business days", base_cost: 5.99, per_kg_cost: 1.5, min_days: 5, max_days: 7, is_active: true },
  { id: "express", name: "Express Shipping", description: "Delivered in 2-3 business days", base_cost: 12.99, per_kg_cost: 3.0, min_days: 2, max_days: 3, is_active: true },
  { id: "overnight", name: "Overnight Shipping", description: "Next business day delivery", base_cost: 24.99, per_kg_cost: 5.0, min_days: 1, max_days: 1, is_active: false },
  { id: "free", name: "Free Shipping", description: "Free for orders over $50", base_cost: 0, per_kg_cost: 0, min_days: 7, max_days: 14, is_active: true },
];

export default function ShippingMethodsPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>(defaultMethods);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<ShippingMethod, "id">>({
    name: "", description: "", base_cost: 0, per_kg_cost: 0, min_days: 3, max_days: 7, is_active: true,
  });

  const toggle = (id: string) => {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, is_active: !m.is_active } : m)));
  };

  const startEdit = (m: ShippingMethod) => {
    setEditingId(m.id);
    setForm({ name: m.name, description: m.description, base_cost: m.base_cost, per_kg_cost: m.per_kg_cost, min_days: m.min_days, max_days: m.max_days, is_active: m.is_active });
    setShowForm(true);
  };

  const save = () => {
    if (editingId) {
      setMethods((prev) => prev.map((m) => (m.id === editingId ? { ...m, ...form } : m)));
    } else {
      setMethods((prev) => [...prev, { id: Date.now().toString(), ...form }]);
    }
    resetForm();
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", description: "", base_cost: 0, per_kg_cost: 0, min_days: 3, max_days: 7, is_active: true });
  };

  const remove = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Shipping Methods</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure available shipping options</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="size-4" /> Add Method
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold">{editingId ? "Edit" : "New"} Shipping Method</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Express Shipping" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Delivered in 2-3 days" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Base Cost ($)</label>
              <Input type="number" step="0.01" value={form.base_cost} onChange={(e) => setForm({ ...form, base_cost: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Per KG Cost ($)</label>
              <Input type="number" step="0.01" value={form.per_kg_cost} onChange={(e) => setForm({ ...form, per_kg_cost: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min Delivery Days</label>
              <Input type="number" value={form.min_days} onChange={(e) => setForm({ ...form, min_days: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Delivery Days</label>
              <Input type="number" value={form.max_days} onChange={(e) => setForm({ ...form, max_days: Number(e.target.value) })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
          </label>
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              {editingId ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
          </div>
          <p className="text-xs text-amber-600">Note: Shipping method persistence requires a dedicated API endpoint and database table.</p>
        </div>
      )}

      <div className="space-y-3">
        {methods.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.is_active ? "bg-indigo-50" : "bg-gray-50"}`}>
                <Truck className={`size-5 ${m.is_active ? "text-indigo-600" : "text-gray-400"}`} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{m.name}</h3>
                <p className="text-xs text-gray-500">{m.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  ${m.base_cost.toFixed(2)} base + ${m.per_kg_cost.toFixed(2)}/kg &middot; {m.min_days}-{m.max_days} days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {m.is_active ? "Active" : "Inactive"}
              </span>
              <button onClick={() => toggle(m.id)} className={`relative w-11 h-6 rounded-full transition-colors ${m.is_active ? "bg-indigo-600" : "bg-gray-200"}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${m.is_active ? "left-[22px]" : "left-0.5"}`} />
              </button>
              <button onClick={() => startEdit(m)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil className="size-4" /></button>
              <button onClick={() => remove(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
