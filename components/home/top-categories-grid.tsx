import { SectionHeader } from "@/components/section-header";
import { CategoryCard } from "@/components/category-card";
import type { Category } from "@/lib/types";

interface TopCategoriesGridProps {
  categories: Category[];
}

/**
 * TopCategoriesGrid — Premium circular category strip.
 * Uses circle variant of CategoryCard with hover scale + ring animation.
 */
export function TopCategoriesGrid({ categories }: TopCategoriesGridProps) {
  return (
    <div>
      {/* Section header */}
      <SectionHeader title="Top Categories" viewAllHref="/categories" />

      {/* Responsive grid: 3 → 4 → 5 → 6 → 8 columns */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 sm:gap-6 py-2">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} variant="circle" />
        ))}
      </div>
    </div>
  );
}
