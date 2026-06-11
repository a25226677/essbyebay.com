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

// Shown when no active banners exist in the DB so the hero is never empty
const FALLBACK_SLIDES: BannerSlide[] = [
  {
    id: "fallback-1",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1600&q=80",
    title: "Shop Top Deals Across Every Category",
    subtitle: "Thousands of products from trusted sellers — updated daily.",
    link: "/flash-deals",
    buttonText: "Shop Now",
  },
  {
    id: "fallback-2",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80",
    title: "New Arrivals Every Week",
    subtitle: "Fresh finds in fashion, tech, home and more.",
    link: "/search?category=women-clothing-fashion",
    buttonText: "Explore",
  },
];

export function HeroSection({ categories, bannerSlides, flashDeals = [] }: HeroSectionProps) {
  const slides = bannerSlides.length > 0 ? bannerSlides : FALLBACK_SLIDES;
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

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

        {/* ── Category Sidebar — lg+ only ── */}
        <aside className="hidden lg:block w-[180px] xl:w-[200px] flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full shadow-sm">
            <div className="bg-[#1b233a] px-3 py-2.5">
              <p className="text-white text-[12px] font-bold uppercase tracking-wide">
                All Categories
              </p>
            </div>
            <nav className="py-1">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/search?category=${cat.slug}`}
                  className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-gray-700 hover:bg-[#fff8f0] hover:text-[#f77f00] border-l-2 border-transparent hover:border-[#f77f00] transition-all group"
                >
                  <span className="w-2 h-2 rounded-full bg-gray-300 group-hover:bg-[#f77f00] transition-colors flex-shrink-0" />
                  <span className="truncate">{cat.name}</span>
                </Link>
              ))}
              <Link
                href="/categories"
                className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-[#f77f00] font-semibold hover:underline border-t border-gray-100 mt-1"
              >
                View all categories →
              </Link>
            </nav>
          </div>
        </aside>

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
                {slides.map((slide, i) => (
                  <CarouselItem key={slide.id}>
                    <Link href={slide.link} className="block group">
                      <div className="relative w-full h-[220px] sm:h-[280px] md:h-[360px] lg:h-[400px] xl:h-[440px] rounded-xl overflow-hidden bg-gray-950 shadow-xl">
                        <Image
                          src={slide.image}
                          alt={slide.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) calc(100vw - 220px), calc(100vw - 240px)"
                          className="object-cover ease-out group-hover:scale-105"
                          style={{ transition: "transform 1200ms ease-out" }}
                          priority={i === 0}
                          loading={i === 0 ? "eager" : "lazy"}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 md:px-14 max-w-[520px]">
                          <span className="inline-flex items-center gap-1.5 bg-[#f77f00]/20 border border-[#f77f00]/40 text-[#f5a623] text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full w-fit mb-3 backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#f77f00] animate-pulse" />
                            Best Deals
                          </span>
                          <h2 className="text-white text-xl sm:text-3xl md:text-4xl lg:text-[2.4rem] font-extrabold mb-2 leading-[1.15] drop-shadow-lg tracking-tight">
                            {slide.title}
                          </h2>
                          <p className="text-white/75 text-sm md:text-base mb-5 drop-shadow leading-relaxed max-w-[360px] hidden sm:block">
                            {slide.subtitle}
                          </p>
                          <span className="inline-flex items-center gap-2 bg-[#f77f00] text-white px-5 py-2.5 rounded-lg font-bold w-fit hover:bg-[#e67300] active:scale-95 transition-all duration-200 text-sm shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50">
                            {slide.buttonText}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-3 w-9 h-9 bg-black/30 border-white/20 text-white hover:bg-black/60 hover:border-white/40 backdrop-blur-sm transition-all duration-200 shadow-lg" />
              <CarouselNext className="right-3 w-9 h-9 bg-black/30 border-white/20 text-white hover:bg-black/60 hover:border-white/40 backdrop-blur-sm transition-all duration-200 shadow-lg" />
            </Carousel>

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

        {/* ── Today's Deal sidebar — xl+ only ── */}
        {flashDeals.length > 0 && (
          <div className="hidden xl:block w-[220px] flex-shrink-0">
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
                    <div className="relative w-[56px] h-[56px] flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden">
                      <Image
                        src={deal.product.image}
                        alt={deal.product.title}
                        fill
                        sizes="56px"
                        className="object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-700 line-clamp-2 leading-tight">
                        {deal.product.title}
                      </p>
                      <p className="text-[13px] font-bold text-[#f77f00] mt-1">
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
