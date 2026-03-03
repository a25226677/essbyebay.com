import { SectionHeader } from "@/components/section-header";
import { ProductCard } from "@/components/product-card";
import type { FlashDeal } from "@/lib/types";

interface FlashDealsRowProps {
  flashDeals: FlashDeal[];
}

export function FlashDealsRow({ flashDeals }: FlashDealsRowProps) {
  return (
    <div>
      <SectionHeader title="Best Selling" badge="Hot" viewAllHref="/flash-deals" />
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
