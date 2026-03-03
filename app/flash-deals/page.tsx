import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { CountdownBanner } from "@/components/flash-deals/countdown-banner";
import { getFlashDeals } from "@/lib/storefront-data";

export default async function FlashDealsPage() {
  const flashDeals = await getFlashDeals();

  return (
    <div className="store-page-bg">
      <div className="store-page-container py-8">
        <BreadcrumbNav items={[{ label: "Flash Deals" }]} />
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">Flash Deals</h1>
          <Badge variant="destructive">Hot</Badge>
        </div>

        <div className="mb-5">
          <CountdownBanner endTime={flashDeals[0]?.dealEndTime ?? ""} />
        </div>

        <div className="store-surface p-4 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {flashDeals.map((deal) => (
              <ProductCard key={deal.product.id} product={deal.product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
