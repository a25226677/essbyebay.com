"use client";

import { SlidersHorizontal, CreditCard, Truck, Bell, Shield, Database, Mail, ToggleRight, ToggleLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const tabs = [
  { key: "system", label: "System", icon: SlidersHorizontal },
  { key: "payment", label: "Payment Gateways", icon: CreditCard },
  { key: "shipping", label: "Shipping", icon: Truck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Shield },
];

const paymentGateways = [
  { name: "Stripe", logo: "💳", enabled: true, mode: "Live" },
  { name: "PayPal", logo: "🅿️", enabled: true, mode: "Live" },
  { name: "Razorpay", logo: "₹", enabled: false, mode: "Test" },
  { name: "Square", logo: "⬛", enabled: false, mode: "Test" },
  { name: "2Checkout", logo: "2️⃣", enabled: false, mode: "Test" },
];

const shippingMethods = [
  { name: "Standard Delivery", duration: "5-7 days", price: "$4.99", enabled: true },
  { name: "Express Delivery", duration: "2-3 days", price: "$12.99", enabled: true },
  { name: "Overnight Delivery", duration: "1 day", price: "$24.99", enabled: true },
  { name: "Free Shipping", duration: "7-10 days", price: "$0.00", enabled: true, minOrder: "$50.00" },
  { name: "Store Pickup", duration: "Same day", price: "$0.00", enabled: false },
];

export default function SetupConfigurationsPage() {
  const [active, setActive] = useState("system");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Setup & Configurations</h1>

      {/* Preview Mode Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
        <SlidersHorizontal className="size-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Preview Mode</p>
          <p className="text-xs text-amber-600">Configuration settings shown are defaults. Changes will take effect once connected to the settings database table.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActive(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-md transition-colors font-medium ${
                active === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              <Icon className="size-3.5" />{t.label}
            </button>
          );
        })}
      </div>

      {active === "system" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-3 mb-4">System Configuration</h2>
            <div className="space-y-3">
              {[
                { label: "Maintenance Mode", description: "Take the site offline for maintenance", enabled: false },
                { label: "User Registration", description: "Allow new user registrations", enabled: true },
                { label: "Seller Registration", description: "Allow new seller applications", enabled: true },
                { label: "Guest Checkout", description: "Allow checkout without account", enabled: false },
                { label: "Product Reviews", description: "Allow customers to leave reviews", enabled: true },
                { label: "Email Verification", description: "Require email verification on signup", enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  {item.enabled
                    ? <ToggleRight className="size-7 text-green-500 cursor-pointer hover:text-green-600" />
                    : <ToggleLeft className="size-7 text-gray-300 cursor-pointer hover:text-gray-400" />
                  }
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Database className="size-4" />Cache & Performance</h2>
            <div className="flex flex-wrap gap-2">
              <button className="text-xs px-4 py-2 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">Clear All Cache</button>
              <button className="text-xs px-4 py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">Rebuild Sitemap</button>
              <button className="text-xs px-4 py-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">Optimize Database</button>
            </div>
          </div>
        </div>
      )}

      {active === "payment" && (
        <div className="space-y-4">
          {paymentGateways.map((gw) => (
            <div key={gw.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{gw.logo}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{gw.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${gw.mode === "Live" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{gw.mode} Mode</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {gw.enabled
                    ? <ToggleRight className="size-7 text-green-500 cursor-pointer" />
                    : <ToggleLeft className="size-7 text-gray-300 cursor-pointer" />
                  }
                  <button className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Configure</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {active === "shipping" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Shipping Methods</h2>
            <Button size="sm" className="gap-1 text-xs"><Truck className="size-3" />Add Method</Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-5 py-3 text-left">Method</th>
                <th className="px-5 py-3 text-left">Duration</th>
                <th className="px-5 py-3 text-left">Price</th>
                <th className="px-5 py-3 text-left">Min Order</th>
                <th className="px-5 py-3 text-left">Enabled</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shippingMethods.map((m) => (
                <tr key={m.name} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-xs font-semibold text-gray-800">{m.name}</td>
                  <td className="px-5 py-3 text-xs text-gray-600">{m.duration}</td>
                  <td className="px-5 py-3 text-xs font-semibold text-green-700">{m.price}</td>
                  <td className="px-5 py-3 text-xs text-gray-500">{m.minOrder || "—"}</td>
                  <td className="px-5 py-3">
                    {m.enabled ? <ToggleRight className="size-6 text-green-500 cursor-pointer" /> : <ToggleLeft className="size-6 text-gray-300 cursor-pointer" />}
                  </td>
                  <td className="px-5 py-3 flex gap-1">
                    <button className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active === "notifications" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Mail className="size-4 text-blue-500" />Email Notifications</h2>
          <div className="space-y-3">
            {[
              { label: "New Order Notification", description: "Send email on new order placement", enabled: true },
              { label: "Order Status Updates", description: "Notify customers on order changes", enabled: true },
              { label: "New Seller Registration", description: "Alert on new seller applications", enabled: true },
              { label: "Low Stock Alert", description: "Notify when product stock is low", enabled: false },
              { label: "Customer Review", description: "Alert on new customer reviews", enabled: false },
              { label: "Support Ticket Created", description: "Notify support team on new tickets", enabled: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                {item.enabled
                  ? <ToggleRight className="size-7 text-green-500 cursor-pointer" />
                  : <ToggleLeft className="size-7 text-gray-300 cursor-pointer" />
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {active === "security" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-3 mb-4">Security Settings</h2>
            <div className="space-y-3">
              {[
                { label: "Two-Factor Authentication", description: "Require 2FA for admin login", enabled: false },
                { label: "CAPTCHA on Login", description: "reCAPTCHA on login & registration", enabled: true },
                { label: "IP Whitelist (Admin)", description: "Restrict admin access by IP", enabled: false },
                { label: "Auto-logout Inactive Admin", description: "Logout after 30 minutes idle", enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  {item.enabled
                    ? <ToggleRight className="size-7 text-green-500 cursor-pointer" />
                    : <ToggleLeft className="size-7 text-gray-300 cursor-pointer" />
                  }
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Change Admin Password</h2>
            <div className="max-w-sm space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Current Password</label>
                <Input type="password" placeholder="••••••••" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">New Password</label>
                <Input type="password" placeholder="••••••••" className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Confirm New Password</label>
                <Input type="password" placeholder="••••••••" className="text-sm" />
              </div>
              <Button size="sm" className="gap-2"><Shield className="size-3.5" /> Update Password</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
