import { SectionHeader } from "@/components/section-header";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";

interface NewProductsGridProps {
  products: Product[];
}

export function NewProductsGrid({ products }: NewProductsGridProps) {
  return (
    <div>
      <SectionHeader title="New Products" viewAllHref="/search" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
