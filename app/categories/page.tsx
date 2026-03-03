import { CategoryCard } from "@/components/category-card";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { getStorefrontCategories } from "@/lib/storefront-data";

export const metadata = { title: "All Categories" };

export default async function CategoriesPage() {
  const categories = await getStorefrontCategories();

  return (
    <div className="store-page-bg">
      <div className="store-page-container py-8">
        <BreadcrumbNav items={[{ label: "All Categories" }]} />
        <h1 className="text-2xl font-bold mb-6">All Categories</h1>
        <div className="store-surface p-4 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
