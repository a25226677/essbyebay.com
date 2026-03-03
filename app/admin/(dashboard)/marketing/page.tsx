"use client";

import { useState } from "react";
import { Megaphone, Tag, ImageIcon, Plus, ToggleLeft, ToggleRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

const campaigns = [
  { id: "C001", name: "Spring Sale 2026", type: "Discount", discount: "20%", start: "Mar 1, 2026", end: "Mar 31, 2026", status: "Scheduled" },
  { id: "C002", name: "Flash Friday Deals", type: "Flash Sale", discount: "30-50%", start: "Feb 28, 2026", end: "Mar 2, 2026", status: "Active" },
  { id: "C003", name: "New User Promo", type: "Welcome", discount: "10%", start: "Jan 1, 2026", end: "Dec 31, 2026", status: "Active" },
  { id: "C004", name: "Holiday Clearance", type: "Clearance", discount: "40%", start: "Jan 15, 2026", end: "Feb 15, 2026", status: "Ended" },
];

const coupons = [
  { code: "WELCOME10", discount: "10%", usage: "234 / 500", expiry: "Dec 31, 2026", status: true },
  { code: "FLASH30", discount: "30%", usage: "87 / 100", expiry: "Mar 2, 2026", status: true },
  { code: "SPRING20", discount: "20%", usage: "0 / 200", expiry: "Apr 1, 2026", status: false },
  { code: "VIP50", discount: "50%", usage: "12 / 20", expiry: "Feb 28, 2026", status: true },
];

const banners = [
  { name: "Hero Banner 1", position: "Homepage Hero", size: "1920x600", status: true },
  { name: "Side Banner A", position: "Sidebar Right", size: "300x250", status: true },
  { name: "Flash Deal Strip", position: "Above Product List", size: "1200x150", status: false },
];

export default function MarketingPage() {
  const [active, setActive] = useState<"campaigns" | "coupons" | "banners">("campaigns");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Marketing</h1>
        <Button size="sm" className="gap-2" onClick={() => alert("Marketing module is in preview mode. Database tables for campaigns, coupons, and banners will be added in a future update.")}><Plus className="size-4" /> Create New</Button>
      </div>

      {/* Preview Mode Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
        <Megaphone className="size-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800">Preview Mode</p>
          <p className="text-xs text-amber-600">This page shows sample data. Marketing campaigns, coupons, and banners will be functional once the marketing database tables are created.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "campaigns", label: "Campaigns", icon: Megaphone },
          { key: "coupons", label: "Coupons", icon: Tag },
          { key: "banners", label: "Banners", icon: ImageIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key as typeof active)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-md transition-colors font-medium ${
                active === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Campaigns Tab */}
      {active === "campaigns" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left">Campaign</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Discount</th>
                  <th className="px-4 py-3 text-left">Duration</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-800">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.type}</td>
                    <td className="px-4 py-3 text-xs font-bold text-orange-600">{c.discount}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="size-3" />{c.start} → {c.end}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        c.status === "Active" ? "bg-green-100 text-green-700" :
                        c.status === "Scheduled" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 flex gap-1">
                      <button className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Edit</button>
                      <button className="text-[10px] px-2 py-0.5 bg-red-50 text-red-500 rounded hover:bg-red-100">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Coupons Tab */}
      {active === "coupons" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Discount</th>
                  <th className="px-4 py-3 text-left">Usage</th>
                  <th className="px-4 py-3 text-left">Expiry</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600 bg-blue-50 rounded-md inline-block m-2">{c.code}</td>
                    <td className="px-4 py-3 text-xs font-bold text-orange-600">{c.discount}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{c.usage}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.expiry}</td>
                    <td className="px-4 py-3">
                      {c.status ? <ToggleRight className="size-5 text-green-500" /> : <ToggleLeft className="size-5 text-gray-300" />}
                    </td>
                    <td className="px-4 py-3 flex gap-1">
                      <button className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Banners Tab */}
      {active === "banners" && (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <ImageIcon className="size-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.position} · {b.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {b.status ? <ToggleRight className="size-6 text-green-500 cursor-pointer" /> : <ToggleLeft className="size-6 text-gray-300 cursor-pointer" />}
                <button className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
