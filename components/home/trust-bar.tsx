"use client";

import { Truck, RotateCcw, Lock, MessageCircle } from "lucide-react";

const trustItems = [
  { Icon: Truck, label: "Free Shipping", sub: "On orders $50+", color: "#f77f00" },
  { Icon: RotateCcw, label: "30-Day Returns", sub: "Easy & hassle-free", color: "#22c55e" },
  { Icon: Lock, label: "Secure Payment", sub: "SSL encrypted", color: "#3b82f6" },
  { Icon: MessageCircle, label: "24/7 Support", sub: "Always here for you", color: "#a855f7" },
];

export function TrustBar() {
  return (
    <div className="bg-[#1b233a] border-b border-[#263348]">
      <div className="max-w-[1340px] mx-auto px-4">
        {/* Mobile: 2×2 grid */}
        <div className="grid grid-cols-2 sm:hidden py-2 gap-y-2">
          {trustItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-2">
              <item.Icon size={16} style={{ color: item.color }} className="flex-shrink-0" />
              <span className="text-[11px] text-gray-300 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
        {/* Tablet+: single row */}
        <div className="hidden sm:flex items-center justify-center divide-x divide-[#2d3a50] h-9">
          {trustItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-4 lg:px-6">
              <item.Icon size={16} style={{ color: item.color }} className="flex-shrink-0" />
              <span className="text-[12px] text-gray-300 font-medium whitespace-nowrap">
                {item.label}
              </span>
              <span className="hidden lg:inline text-[11px] text-gray-500">— {item.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
