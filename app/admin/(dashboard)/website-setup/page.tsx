"use client";

import { Globe, Palette, FileText, Menu, Mail, MapPin, Phone, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const tabs = [
  { key: "general", label: "General", icon: Globe },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "pages", label: "Pages", icon: FileText },
  { key: "menus", label: "Menus", icon: Menu },
  { key: "contact", label: "Contact Info", icon: Mail },
];

export default function WebsiteSetupPage() {
  const [active, setActive] = useState("general");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Website Setup</h1>

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

      {active === "general" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">General Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Site Name", placeholder: "eBay Store", defaultValue: "eBay Store" },
              { label: "Site Tagline", placeholder: "Buy & Sell Online", defaultValue: "Buy & Sell Online" },
              { label: "Site Email", placeholder: "admin@ebay-store.com", defaultValue: "admin@ebay-store.com" },
              { label: "Currency", placeholder: "USD", defaultValue: "USD" },
              { label: "Currency Symbol", placeholder: "$", defaultValue: "$" },
              { label: "Timezone", placeholder: "UTC-5 EST", defaultValue: "UTC-5 EST" },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                <Input defaultValue={field.defaultValue} placeholder={field.placeholder} className="text-sm" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Site Logo</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-300 transition-colors">
              <Upload className="size-6 text-gray-400" />
              <p className="text-xs text-gray-500">Click to upload or drag & drop</p>
              <p className="text-[10px] text-gray-400">PNG, JPG, SVG up to 2MB</p>
            </div>
          </div>
          <Button size="sm" className="w-full sm:w-auto">Save General Settings</Button>
        </div>
      )}

      {active === "appearance" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Appearance & Branding</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Primary Color", value: "#3B82F6" },
              { label: "Secondary Color", value: "#F59E0B" },
              { label: "Accent Color", value: "#10B981" },
            ].map((c) => (
              <div key={c.label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{c.label}</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
                  <input type="color" defaultValue={c.value} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <span className="text-xs font-mono text-gray-600">{c.value}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Theme Style</label>
            <div className="flex gap-3">
              {["Light", "Dark", "System"].map((theme) => (
                <button key={theme} className={`px-4 py-2 text-xs rounded-lg border transition-colors ${theme === "Light" ? "bg-blue-500 border-blue-500 text-white" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}>{theme}</button>
              ))}
            </div>
          </div>
          <Button size="sm" className="w-full sm:w-auto">Save Appearance</Button>
        </div>
      )}

      {active === "pages" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500">
                <th className="px-5 py-3 text-left">Page Name</th>
                <th className="px-5 py-3 text-left">Slug</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "About Us", slug: "/about", status: "Published" },
                { name: "Contact Us", slug: "/contact", status: "Published" },
                { name: "Privacy Policy", slug: "/privacy-policy", status: "Published" },
                { name: "Terms of Service", slug: "/terms", status: "Published" },
                { name: "Return Policy", slug: "/return-policy", status: "Published" },
                { name: "FAQ", slug: "/faq", status: "Draft" },
              ].map((p) => (
                <tr key={p.name} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-xs font-medium text-gray-800">{p.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-blue-600">{p.slug}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.status === "Published" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{p.status}</span>
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

      {active === "menus" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Navigation Menus</h2>
          {["Main Navigation", "Footer Menu", "Top Bar Links"].map((menu) => (
            <div key={menu} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700">{menu}</h3>
                <button className="text-xs text-blue-500 hover:underline">Edit Items</button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {["Home", "Products", "Categories", "Brands", "Blog", "Contact"].slice(0, menu === "Top Bar Links" ? 3 : 6).map((item) => (
                  <span key={item} className="text-[10px] px-2 py-1 bg-gray-100 rounded-md text-gray-600">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {active === "contact" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Contact Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1"><Mail className="size-3.5" />Email</label>
              <Input defaultValue="support@ebay-store.com" className="text-sm" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1"><Phone className="size-3.5" />Phone</label>
              <Input defaultValue="+1 (800) 123-4567" className="text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1"><MapPin className="size-3.5" />Address</label>
              <Input defaultValue="123 Commerce Street, New York, NY 10001, USA" className="text-sm" />
            </div>
          </div>
          <Button size="sm" className="w-full sm:w-auto">Save Contact Info</Button>
        </div>
      )}
    </div>
  );
}
