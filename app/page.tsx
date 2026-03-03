import Image from "next/image";
import Link from "next/link";
import { getHomeStorefrontData } from "@/lib/storefront-data";
import { HeroSection } from "@/components/home/hero-section";
import { PromoBanners } from "@/components/home/promo-banners";
import { FlashDealsRow } from "@/components/home/flash-deals-row";
import { TopCategoriesGrid } from "@/components/home/top-categories-grid";
import { NewProductsGrid } from "@/components/home/new-products-grid";
import { TopBrandsRow } from "@/components/home/top-brands-row";
import { SectionHeader } from "@/components/section-header";
import { CategoryCard } from "@/components/category-card";
import { ProductCard } from "@/components/product-card";

export default async function HomePage() {
  const { categories, products, flashDeals, brands, bannerSlides } =
    await getHomeStorefrontData();

  return (
    <div className="store-page-bg">
      {/* ── Hero: Banner carousel + Today's Deal sidebar ── */}
      <HeroSection
        categories={categories}
        bannerSlides={bannerSlides}
        flashDeals={flashDeals}
      />

      {/* ── Promotional Banners ── */}
      <PromoBanners />

      {/* ── Best Selling / Flash Deals ── */}
      <section className="store-page-container store-section">
        <FlashDealsRow flashDeals={flashDeals} />
      </section>

      {/* ── New Products ── */}
      <section className="store-page-container store-section">
        <NewProductsGrid products={products.slice(0, 12)} />
      </section>

      {/* ── Per-Category Featured Sections (eBay-style: banner left + products right) ── */}
      {categories.map((category) => {
        const catProducts = products.filter(
          (p) => p.category === category.slug
        );
        if (catProducts.length === 0) return null;
        return (
          <section key={category.id} className="store-page-container py-3 lg:py-4">
            <div className="flex gap-3 items-stretch">
              {/* ── Category Banner (left) ── */}
              <Link
                href={`/search?q=${encodeURIComponent(category.name)}`}
                className="hidden md:flex flex-col flex-shrink-0 w-[160px] lg:w-[180px] rounded overflow-hidden bg-white border border-gray-200 hover:shadow-md transition-shadow group relative"
              >
                <div className="relative flex-1 min-h-[220px]">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="180px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-semibold leading-tight drop-shadow">{category.name}</p>
                  <span className="text-[11px] text-orange-300 font-medium mt-0.5 block">View All →</span>
                </div>
              </Link>

              {/* ── Products grid (right) ── */}
              <div className="flex-1 min-w-0">
                {/* Mobile: show header above */}
                <div className="md:hidden mb-2">
                  <SectionHeader
                    title={category.name}
                    viewAllHref={`/search?q=${encodeURIComponent(category.name)}`}
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 h-full">
                  {catProducts.slice(0, 5).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* ── Browse Categories — full card grid with top images ── */}
      <section className="bg-white">
        <div className="store-page-container py-8">
          <SectionHeader title="Browse Categories" viewAllHref="/categories" />
          <p className="text-sm text-gray-400 -mt-2 mb-5">
            Shop by category and find exactly what you&apos;re looking for
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} category={cat} variant="card" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Top Categories — circular icon grid ── */}
      <section className="bg-gradient-to-b from-white to-gray-50/80">
        <div className="store-page-container py-8">
          <TopCategoriesGrid categories={categories} />
        </div>
      </section>

      {/* ── Top Brands ── */}
      <section className="bg-white border-t border-gray-100">
        <div className="store-page-container py-8">
          <TopBrandsRow brands={brands} />
        </div>
      </section>
    </div>
  );
}
