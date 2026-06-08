import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { BrandCard } from "@/components/brand-card";
import type { Brand } from "@/lib/types";

interface TopBrandsRowProps {
  brands: Brand[];
}

export function TopBrandsRow({ brands }: TopBrandsRowProps) {
  return (
    <div>
      <div className="flex items-end justify-between mb-1">
        <div>
          <SectionHeader title="Top Brands" />
          <p className="text-[12px] text-gray-400 -mt-2 mb-3">
            Official brands, verified sellers
          </p>
        </div>
        <Link
          href="/brands"
          className="text-xs font-semibold text-[#f77f00] hover:underline mb-4 flex-shrink-0"
        >
          View All
        </Link>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {brands.slice(0, 16).map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>
    </div>
  );
}
