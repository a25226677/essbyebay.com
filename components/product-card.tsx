"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Eye, GitCompare, ShoppingCart } from "lucide-react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  variant?: "default" | "compact";
  showNewBadge?: boolean;
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="text-[12px] leading-none">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rounded ? "text-[#f77f00]" : "text-gray-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function ProductCard({ product, variant = "default", showNewBadge = false }: ProductCardProps) {
  const addToCart = useCartStore((s) => s.addItem);
  const wishlistAdd = useWishlistStore((s) => s.addItem);
  const wishlistRemove = useWishlistStore((s) => s.removeItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isInWishlist) wishlistRemove(product.id);
    else wishlistAdd(product);
  };

  const discountPercent =
    product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <div
      className={cn(
        "group relative bg-white rounded-lg border border-gray-200 hover:border-[#f77f00]/40 hover:shadow-lg transition-all overflow-hidden flex flex-col",
        variant === "compact" && "w-[200px] md:w-[220px] flex-shrink-0 snap-start"
      )}
    >
      {/* ── Image area ── */}
      <Link href={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-50 flex-shrink-0">
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badge: discount (red) takes priority, then new (orange) */}
        {discountPercent > 0 ? (
          <span className="absolute top-2 left-2 bg-[#e53e3e] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm z-10">
            -{discountPercent}%
          </span>
        ) : showNewBadge ? (
          <span className="absolute top-2 left-2 bg-[#f77f00] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm z-10">
            New
          </span>
        ) : null}

        {/* Hover action icons */}
        <div className="product-card-actions absolute top-2 right-2 flex flex-col gap-1.5 z-10">
          <button
            onClick={toggleWishlist}
            className={cn(
              "w-[30px] h-[30px] bg-white rounded-full shadow flex items-center justify-center hover:bg-[#f77f00] hover:text-white transition-colors text-gray-500",
              isInWishlist && "bg-[#f77f00] text-white"
            )}
            aria-label="Add to wishlist"
          >
            <Heart size={13} fill={isInWishlist ? "currentColor" : "none"} />
          </button>
          <button
            className="w-[30px] h-[30px] bg-white rounded-full shadow flex items-center justify-center hover:bg-[#f77f00] hover:text-white transition-colors text-gray-500"
            aria-label="Quick view"
          >
            <Eye size={13} />
          </button>
          <button
            className="w-[30px] h-[30px] bg-white rounded-full shadow flex items-center justify-center hover:bg-[#f77f00] hover:text-white transition-colors text-gray-500"
            aria-label="Compare"
          >
            <GitCompare size={13} />
          </button>
        </div>
      </Link>

      {/* ── Content ── */}
      <div className="p-3 flex flex-col flex-1">
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-[13px] font-normal text-gray-700 line-clamp-2 hover:text-[#f77f00] transition-colors leading-[1.4] min-h-[36px]">
            {product.title}
          </h3>
        </Link>

        {/* Star rating */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <StarRating rating={product.rating} />
          {product.reviewCount > 0 && (
            <span className="text-[11px] text-gray-400">({product.reviewCount})</span>
          )}
        </div>

        {/* Price row */}
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-[16px] font-bold text-[#1b233a]">
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-[12px] text-gray-400 line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Shipping hint */}
        <span className="text-[11px] text-green-700 font-medium mt-0.5">
          {product.price >= 50 ? "Free Shipping" : "Fast Delivery"}
        </span>

        {/* Add to Cart — always visible */}
        <button
          onClick={() => addToCart(product)}
          className="mt-auto pt-2.5 w-full bg-[#f77f00] text-white text-[12px] font-semibold py-2 rounded flex items-center justify-center gap-1.5 hover:bg-[#e67300] active:scale-95 transition-all"
        >
          <ShoppingCart size={13} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
