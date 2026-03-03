import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/types";

// ─── Stable Unsplash photo IDs per category (no redirects) ─────────────────
// Direct images.unsplash.com URLs avoid the source.unsplash.com redirect chain
// and are compatible with next/image out of the box.
const CATEGORY_IMAGES: Record<string, string> = {
  "women-clothing-fashion":
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80",
  "computer-accessories":
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80",
  "kids-toy":
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  "sports-outdoor":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80",
  "automobile-motorcycle":
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80",
  "phone-accessories":
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80",
  "womens-fashion-bag":
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80",
  "beauty-health-hair":
    "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=80",
  "jewelry-watches":
    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80",
  "men-clothing-fashion":
    "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80",
};

function getCategoryImageSrc(category: { slug: string; name: string; image: string }): string {
  // 1. Use data-layer image if it's already a proper URL
  if (category.image?.startsWith("http")) return category.image;
  // 2. Fall back to our curated per-slug map
  return (
    CATEGORY_IMAGES[category.slug] ??
    // 3. Last resort: generic Unsplash search (hostname already whitelisted)
    `https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80`
  );
}

interface CategoryCardProps {
  category: Category;
  /** Render as full card with top image (default) vs compact circle */
  variant?: "card" | "circle";
}

export function CategoryCard({ category, variant = "card" }: CategoryCardProps) {
  const imgSrc = getCategoryImageSrc(category);

  /* ── Compact circle variant (used by TopCategoriesGrid) ── */
  if (variant === "circle") {
    return (
      <Link
        href={`/search?q=${encodeURIComponent(category.name)}`}
        className="flex flex-col items-center gap-2.5 group"
      >
        <div className="w-[74px] h-[74px] sm:w-[84px] sm:h-[84px] rounded-full overflow-hidden relative ring-2 ring-transparent group-hover:ring-[#f77f00] shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:shadow-orange-200">
          <Image
            src={imgSrc}
            alt={category.name}
            fill
            sizes="84px"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {/* subtle overlay on hover */}
          <div className="absolute inset-0 bg-[#f77f00]/0 group-hover:bg-[#f77f00]/10 transition-colors duration-300" />
        </div>
        <span className="text-[11px] sm:text-[12px] font-semibold text-gray-700 text-center line-clamp-2 leading-tight max-w-[90px]">
          {category.name}
        </span>
      </Link>
    );
  }

  /* ── Full card variant ── */
  return (
    <Link
      href={`/search?q=${encodeURIComponent(category.name)}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-gray-200 hover:border-[#f77f00]/50 hover:shadow-lg hover:shadow-orange-100/60 transition-all duration-300 bg-white"
    >
      {/* Top image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          src={imgSrc}
          alt={category.name}
          fill
          sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Soft bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Card body */}
      <div className="px-3 py-2.5 flex flex-col gap-0.5">
        <span className="text-[13px] font-bold text-gray-800 line-clamp-1 leading-snug">
          {category.name}
        </span>
        {category.productCount > 0 && (
          <span className="text-[11px] text-gray-400 font-medium">
            {category.productCount} products
          </span>
        )}
      </div>
    </Link>
  );
}
