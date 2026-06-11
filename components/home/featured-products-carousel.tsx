"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";

interface FeaturedProductsCarouselProps {
  products: Product[];
  title?: string;
}

export function FeaturedProductsCarousel({ products, title = "Featured Products" }: FeaturedProductsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    );
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        container.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [products]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 300;
    const newScrollLeft =
      direction === "left"
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({ left: newScrollLeft, behavior: "smooth" });
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="store-page-container store-section">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-[3px] h-[18px] bg-[#f77f00] rounded-sm flex-shrink-0" />
          <h2 className="text-[14px] font-extrabold text-[#1b233a] uppercase tracking-wide">
            {title}
          </h2>
        </div>
        <Link
          href="/search"
          className="text-[12px] text-[#f77f00] hover:text-[#e67300] font-semibold"
        >
          View all →
        </Link>
      </div>

      {/* Carousel container */}
      <div className="relative group">
        {/* Scroll container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Navigation buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} className="text-gray-700" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-full p-2 shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} className="text-gray-700" />
          </button>
        )}
      </div>
    </section>
  );
}
