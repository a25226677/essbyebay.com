"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { FlashDeal } from "@/lib/types";

interface DealOfTheDayProps {
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

  return { h: pad(h), m: pad(m), s: pad(s), expired: seconds === 0 };
}

function TimerBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/10 border border-white/15 rounded-md px-3 py-1.5 min-w-[48px] text-center">
        <span className="text-xl sm:text-2xl font-extrabold text-white leading-none tabular-nums">
          {value}
        </span>
      </div>
      <span className="text-[9px] uppercase tracking-widest text-gray-400 mt-1">{label}</span>
    </div>
  );
}

export function DealOfTheDay({ flashDeals }: DealOfTheDayProps) {
  const deal = flashDeals[0];
  if (!deal) return null;

  const { h, m, s, expired } = useCountdown(deal.dealEndTime);
  if (expired) return null;

  const { product, discountPercent } = deal;

  return (
    <div className="bg-gradient-to-r from-[#1b233a] to-[#2a3550] border-y border-[#2d3a50]">
      <div className="max-w-[1340px] mx-auto px-4 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">

          {/* Product image — mobile only */}
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-white/5 sm:hidden">
            <Image
              src={product.image}
              alt={product.title}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>

          {/* Left — product info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Image — desktop */}
            <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white/5 hidden sm:block">
              <Image
                src={product.image}
                alt={product.title}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-[#f77f00] text-[10px] font-bold uppercase tracking-[0.15em] flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f77f00] animate-pulse" />
                Deal of the Day
              </p>
              <h3 className="text-white font-bold text-sm sm:text-base line-clamp-1 mb-1">
                {product.title}
              </h3>
              <div className="flex items-baseline gap-2 justify-center sm:justify-start">
                <span className="text-[#f77f00] text-lg font-extrabold">
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span className="text-gray-500 text-sm line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="bg-[#e53e3e] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                    -{discountPercent}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center — countdown */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest">Ends in</p>
            <div className="flex items-end gap-2">
              <TimerBlock value={h} label="Hrs" />
              <span className="text-white font-bold text-xl mb-4">:</span>
              <TimerBlock value={m} label="Min" />
              <span className="text-white font-bold text-xl mb-4">:</span>
              <TimerBlock value={s} label="Sec" />
            </div>
          </div>

          {/* Right — CTA */}
          <div className="flex-shrink-0">
            <Link
              href={`/product/${product.slug}`}
              className="inline-flex items-center gap-2 bg-[#f77f00] text-white font-bold px-5 py-2.5 rounded-lg hover:bg-[#e67300] active:scale-95 transition-all text-sm shadow-lg shadow-orange-500/25 whitespace-nowrap w-full sm:w-auto justify-center"
            >
              Grab This Deal
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
