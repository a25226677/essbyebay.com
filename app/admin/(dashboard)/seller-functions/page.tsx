"use client";

import { useState } from "react";
import { Settings2, Percent, Globe, Bell, Truck, Package, CreditCard, Lock, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const functions = [
  { icon: Percent, label: "Commission Settings", description: "Set seller commission rates", href: "/admin/sales", color: "bg-blue-50 text-blue-600" },
  { icon: Globe, label: "Seller Store Settings", description: "Configure seller storefronts", href: "/admin/sellers", color: "bg-indigo-50 text-indigo-600" },
  { icon: Bell, label: "Seller Notifications", description: "Manage notification templates", href: "/admin/support", color: "bg-purple-50 text-purple-600" },
  { icon: Truck, label: "Shipping Rules", description: "Setup shipping for sellers", href: "/admin/shipping", color: "bg-teal-50 text-teal-600" },
  { icon: Package, label: "Product Approval", description: "Auto / manual product review", href: "/admin/products", color: "bg-orange-50 text-orange-600" },
  { icon: CreditCard, label: "Payment Methods", description: "Allowed payment options", href: "/admin/setup-configurations/payment-gateways", color: "bg-green-50 text-green-600" },
  { icon: Lock, label: "Seller Permissions", description: "Feature access controls", href: "/admin/sellers", color: "bg-yellow-50 text-yellow-600" },
  { icon: Settings2, label: "General Functions", description: "Miscellaneous seller settings", href: "/admin/setup-configurations/club-points", color: "bg-gray-50 text-gray-600" },
];

type CommissionItem = { label: string; value: string; description: string; key: string };

const defaultCommissions: CommissionItem[] = [
  { label: "Default Commission Rate", value: "5%", description: "Applied to all new sellers", key: "default" },
  { label: "VIP Seller Rate", value: "3%", description: "For sellers with >$50k monthly", key: "vip" },
  { label: "New Seller Rate", value: "7%", description: "First 3 months of activity", key: "new" },
];

export default function SellerFunctionsPage() {
  const [commissions, setCommissions] = useState<CommissionItem[]>(defaultCommissions);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const openEdit = (item: CommissionItem) => {
    setEditingKey(item.key);
    setEditValue(item.value.replace("%", ""));
  };

  const saveEdit = () => {
    if (!editingKey) return;
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0 || num > 100) {
      toast.error("Enter a valid percentage (0-100)");
      return;
    }
    setCommissions(prev => prev.map(c =>
      c.key === editingKey ? { ...c, value: `${num}%` } : c
    ));
    toast.success("Commission rate updated");
    setEditingKey(null);
    setEditValue("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Seller Functions</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {functions.map((fn) => {
          const Icon = fn.icon;
          return (
            <Link
              key={fn.label}
              href={fn.href}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${fn.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">{fn.label}</h3>
              <p className="text-xs text-gray-500">{fn.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Settings Panel */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Commission Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {commissions.map((item) => (
            <div key={item.key} className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-blue-600 my-1">{item.value}</p>
              <p className="text-[10px] text-gray-400">{item.description}</p>
              <button onClick={() => openEdit(item)}
                className="mt-2 text-xs text-blue-500 hover:underline">Edit</button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Commission Modal */}
      {editingKey && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">Edit Commission Rate</h2>
              <button onClick={() => setEditingKey(null)}><X className="size-4 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-gray-500">
                {commissions.find(c => c.key === editingKey)?.label}
              </p>
              <div className="relative">
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setEditingKey(null)} className="text-sm text-gray-600 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={saveEdit} className="text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-xl">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
