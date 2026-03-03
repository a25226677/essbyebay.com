"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import type { Category, Product } from "@/lib/types";

interface CategoryFeaturedSectionProps {
  category: Category;
  products: Product[];
}

export function CategoryFeaturedSection({
  category,
  products,
}: CategoryFeaturedSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex gap-4">
        {/* Category Banner - Left Side */}
        <Link
          href={`/search?q=${encodeURIComponent(category.name)}`}
          className="hidden md:block w-[280px] flex-shrink-0 group relative overflow-hidden rounded-md"
        >
          <div className="relative w-full h-[420px] bg-gradient-to-br from-pink-300 via-pink-200 to-pink-100">
            {/* Background Image */}
            <Image
              src={category.image}
              alt={category.name}
              fill
              sizes="280px"
              className="object-cover"
            />
            
            {/* Overlay with category name */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            
            {/* Category Title at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
              <h3 className="text-white text-lg font-semibold mb-1">
                {category.name}
              </h3>
              <div className="flex items-center gap-1 text-white/90 text-sm group-hover:gap-2 transition-all">
                <span>View All</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>
        </Link>

        {/* Products - Horizontal Scroll */}
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {products.slice(0, 5).map((product, index) => (
              <div 
                key={product.id} 
                className="flex-shrink-0 w-[240px]"
                style={{
                  animation: `slideIn 0.5s ease-out ${index * 0.1}s both`
                }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
