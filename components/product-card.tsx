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
}

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const addToCart = useCartStore((s) => s.addItem);
  const wishlistAdd = useWishlistStore((s) => s.addItem);
  const wishlistRemove = useWishlistStore((s) => s.removeItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));

  const toggleWishlist = () => {
    if (isInWishlist) {
      wishlistRemove(product.id);
    } else {
      wishlistAdd(product);
    }
  };

  const discountPercent =
    product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  return (
    <div
      className={cn(
        "group relative bg-white rounded border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden",
        variant === "compact" && "w-[200px] md:w-[220px] flex-shrink-0 snap-start"
      )}
    >
      {/* Image */}
      <Link href={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-50">
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Discount badge */}
        {discountPercent > 0 && (
          <span className="absolute top-2 left-2 bg-[#e53e3e] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
            -{discountPercent}%
          </span>
        )}

        {/* Hover action icons - right side vertical stack */}
        <div className="product-card-actions absolute top-2 right-2 flex flex-col gap-1.5">
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist();
            }}
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

        {/* Add to cart - bottom hover */}
        <button
          onClick={(e) => {
            e.preventDefault();
            addToCart(product);
          }}
          className="product-card-actions absolute bottom-0 left-0 right-0 bg-[#f77f00] text-white text-xs font-semibold py-2 flex items-center justify-center gap-1.5 hover:bg-[#e67300] transition-colors"
        >
          <ShoppingCart size={13} />
          Add to Cart
        </button>
      </Link>

      {/* Content */}
      <div className="p-3">
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-[13px] font-normal text-gray-700 line-clamp-2 hover:text-[#f77f00] transition-colors leading-[1.4] min-h-[36px]">
            {product.title}
          </h3>
        </Link>

        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-[15px] font-bold text-[#f77f00]">
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-[12px] text-gray-400 line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
