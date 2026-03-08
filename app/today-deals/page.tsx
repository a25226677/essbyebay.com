import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ProductCard } from "@/components/product-card";
import { Badge } from "@/components/ui/badge";
import { CountdownBanner } from "@/components/flash-deals/countdown-banner";
import { getFlashDeals } from "@/lib/storefront-data";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Today’s Deals and Flash Sale Offers",
  description:
    "Shop limited-time discounts and flash sale offers from top sellers on Ess by Ebay.",
  path: "/today-deals",
  keywords: ["today's deals", "flash sale", "limited-time offers", "discount shopping"],
});

export default async function TodaysDealsPage() {
  const flashDeals = await getFlashDeals();

  return (
    <div className="store-page-bg">
      <div className="store-page-container py-8">
        <BreadcrumbNav items={[{ label: "Today's Deals" }]} />
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">Today&apos;s Deals</h1>
          <Badge className="bg-[#f77f00] hover:bg-[#d66d00]">Active</Badge>
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
