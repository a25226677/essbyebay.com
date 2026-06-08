"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { FlashDeal } from "@/lib/types";

interface FlashDealsRowProps {
  flashDeals: FlashDeal[];
}

function useCountdown(endTime: string) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const getSecondsLeft = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      return Math.max(0, Math.floor(diff / 1000));
    };
    setSeconds(getSecondsLeft());
    const id = setInterval(() => setSeconds(getSecondsLeft()), 1000);
    return () => clearInterval(id);
  }, [endTime]);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { h: pad(h), m: pad(m), s: pad(s) };
}

export function FlashDealsRow({ flashDeals }: FlashDealsRowProps) {
  const endTime = flashDeals[0]?.dealEndTime ?? new Date(Date.now() + 86400000).toISOString();
  const { h, m, s } = useCountdown(endTime);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-[3px] h-[18px] bg-[#f77f00] rounded-sm flex-shrink-0" />
          <h2 className="text-[14px] font-extrabold text-[#1b233a] uppercase tracking-wide">
            Best Selling
          </h2>
          <span className="bg-[#e53e3e] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">
            Hot
          </span>
          {/* Countdown */}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[11px] text-gray-500 font-medium">Ends in:</span>
            {[h, m, s].map((val, i) => (
              <span key={i} className="flex items-center gap-0.5">
                <span className="bg-[#1b233a] text-white text-[11px] font-bold px-1.5 py-0.5 rounded tabular-nums">
                  {val}
                </span>
                {i < 2 && <span className="text-[#1b233a] font-bold text-[11px]">:</span>}
              </span>
            ))}
          </div>
        </div>
        <Link
          href="/flash-deals"
          className="text-[12px] text-[#f77f00] hover:text-[#e67300] flex items-center gap-1 font-semibold flex-shrink-0"
        >
          View all <ArrowRight size={13} />
        </Link>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {flashDeals.map((deal, index) => (
          <ProductCard
            key={`flash-${index}-${deal.product.id}`}
            product={deal.product}
          />
        ))}
      </div>
    </div>
  );
}
