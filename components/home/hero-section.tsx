"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import type { Category, BannerSlide, FlashDeal } from "@/lib/types";

interface HeroSectionProps {
  categories: Category[];
  bannerSlides: BannerSlide[];
  flashDeals?: FlashDeal[];
}

export function HeroSection({ bannerSlides, flashDeals = [] }: HeroSectionProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  /* ── Track active slide for pagination dots ── */
  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => api?.scrollTo(index),
    [api]
  );

  return (
    <div className="max-w-[1340px] mx-auto px-4 pt-4 pb-2">
      <div className="flex gap-3">
        {/* ── Banner carousel ── */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Carousel
              setApi={setApi}
              className="w-full"
              opts={{ loop: true }}
              plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
            >
              <CarouselContent>
                {bannerSlides.map((slide, i) => (
                  <CarouselItem key={slide.id}>
                    <Link href={slide.link} className="block group">
                      {/* Slide container */}
                      <div className="relative w-full h-[260px] sm:h-[320px] md:h-[400px] lg:h-[460px] rounded-xl overflow-hidden bg-gray-950 shadow-xl">
                        {/* Background image with subtle zoom on hover */}
                        <Image
                          src={slide.image}
                          alt={slide.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 80vw"
                          className="object-cover ease-out group-hover:scale-105"
                          style={{ transition: "transform 1200ms ease-out" }}
                          priority={i === 0}
                          loading={i === 0 ? "eager" : "lazy"}
                        />

                        {/* Multi-stop gradient for perfect text contrast */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                        {/* Text + CTA overlay */}
                        <div className="absolute inset-0 flex flex-col justify-center px-7 sm:px-10 md:px-14 max-w-[560px]">
                          {/* Label badge */}
                          <span className="inline-flex items-center gap-1.5 bg-[#f77f00]/20 border border-[#f77f00]/40 text-[#f5a623] text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full w-fit mb-3 backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#f77f00] animate-pulse" />
                            Best Deals
                          </span>

                          {/* Headline */}
                          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-extrabold mb-3 leading-[1.15] drop-shadow-lg tracking-tight">
                            {slide.title}
                          </h2>

                          {/* Subheading */}
                          <p className="text-white/75 text-sm md:text-base mb-6 drop-shadow leading-relaxed max-w-[360px] hidden sm:block">
                            {slide.subtitle}
                          </p>

                          {/* CTA Button */}
                          <span className="inline-flex items-center gap-2 bg-[#f77f00] text-white px-6 py-2.5 rounded-lg font-bold w-fit hover:bg-[#e67300] active:scale-95 transition-all duration-200 text-sm shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50">
                            {slide.buttonText}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>

              {/* Navigation arrows */}
              <CarouselPrevious className="left-3 w-9 h-9 bg-black/30 border-white/20 text-white hover:bg-black/60 hover:border-white/40 backdrop-blur-sm transition-all duration-200 shadow-lg" />
              <CarouselNext className="right-3 w-9 h-9 bg-black/30 border-white/20 text-white hover:bg-black/60 hover:border-white/40 backdrop-blur-sm transition-all duration-200 shadow-lg" />
            </Carousel>

            {/* ── Pagination dots ── */}
            {count > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
                {Array.from({ length: count }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => scrollTo(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className={`rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      i === current
                        ? "w-6 h-2.5 bg-[#f77f00] shadow-md shadow-orange-500/40"
                        : "w-2.5 h-2.5 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Today's Deal sidebar — desktop only ── */}
        {flashDeals.length > 0 && (
          <div className="hidden xl:block w-[230px] flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
              <div className="bg-[#1b233a] text-white px-3 py-3 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold">TODAY&apos;S DEAL</h3>
                <Link href="/today-deals" className="text-[10px] text-gray-400 hover:text-white transition-colors">
                  View All
                </Link>
              </div>
              <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
                {flashDeals.slice(0, 4).map((deal, index) => (
                  <Link
                    key={`deal-${index}-${deal.product.id}`}
                    href={`/product/${deal.product.slug}`}
                    className="flex items-center gap-2.5 p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative w-[60px] h-[60px] flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                      <Image
                        src={deal.product.image}
                        alt={deal.product.title}
                        fill
                        sizes="60px"
                        className="object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] text-gray-700 line-clamp-2 leading-tight">
                        {deal.product.title}
                      </p>
                      <p className="text-[14px] font-bold text-[#f77f00] mt-1">
                        ${deal.product.price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
