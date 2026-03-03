"use client";

import { Settings2, Percent, Globe, Bell, Truck, Package, CreditCard, Lock } from "lucide-react";
import Link from "next/link";

const functions = [
  { icon: Percent, label: "Commission Settings", description: "Set seller commission rates", href: "/admin/sales", color: "bg-blue-50 text-blue-600" },
  { icon: Globe, label: "Seller Store Settings", description: "Configure seller storefronts", href: "/admin/sellers", color: "bg-indigo-50 text-indigo-600" },
  { icon: Bell, label: "Seller Notifications", description: "Manage notification templates", href: "/admin/support-tickets", color: "bg-purple-50 text-purple-600" },
  { icon: Truck, label: "Shipping Rules", description: "Setup shipping for sellers", href: "/admin/setup-configurations", color: "bg-teal-50 text-teal-600" },
  { icon: Package, label: "Product Approval", description: "Auto / manual product review", href: "/admin/products", color: "bg-orange-50 text-orange-600" },
  { icon: CreditCard, label: "Payment Methods", description: "Allowed payment options", href: "/admin/setup-configurations", color: "bg-green-50 text-green-600" },
  { icon: Lock, label: "Seller Permissions", description: "Feature access controls", href: "/admin/sellers", color: "bg-yellow-50 text-yellow-600" },
  { icon: Settings2, label: "General Functions", description: "Miscellaneous seller settings", href: "/admin/setup-configurations", color: "bg-gray-50 text-gray-600" },
];

export default function SellerFunctionsPage() {
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
          {[
            { label: "Default Commission Rate", value: "5%", description: "Applied to all new sellers" },
            { label: "VIP Seller Rate", value: "3%", description: "For sellers with >$50k monthly" },
            { label: "New Seller Rate", value: "7%", description: "First 3 months of activity" },
          ].map((item) => (
            <div key={item.label} className="border border-gray-100 rounded-lg p-4">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-blue-600 my-1">{item.value}</p>
              <p className="text-[10px] text-gray-400">{item.description}</p>
              <button className="mt-2 text-xs text-blue-500 hover:underline">Edit</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
