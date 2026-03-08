import { BrandCard } from "@/components/brand-card";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { getStorefrontBrands } from "@/lib/storefront-data";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Shop All Brands",
  description:
    "Explore featured brands and discover trusted sellers across fashion, electronics, beauty, and more.",
  path: "/brands",
  keywords: ["popular brands", "featured brands", "shop brands"],
});

export default async function BrandsPage() {
  const brands = await getStorefrontBrands();

  return (
    <div className="store-page-bg">
      <div className="store-page-container py-8">
        <BreadcrumbNav items={[{ label: "All Brands" }]} />
        <h1 className="text-2xl font-bold mb-6">All Brands</h1>
        <div className="store-surface p-4 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {brands.map((brand) => (
              <BrandCard key={brand.id} brand={brand} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
