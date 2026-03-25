import { notFound } from "next/navigation";
import { ShopPageClient } from "../shop-page-client";
import type { Metadata } from "next";
import { getShopWithProducts } from "@/lib/storefront-data";
import { buildMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shopSlug } = await params;
  const found = await getShopWithProducts(shopSlug, { topSelling: true });
  const shop = found?.shop;

  if (!shop) {
    return buildMetadata({
      title: "Top Selling Products",
      description: "Top selling products page not found.",
      path: `/shop/${shopSlug}/top-selling`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${shop.name} Top Selling Products`,
    description: `Browse the best-selling products from ${shop.name} on ESS by eBay.`,
    path: `/shop/${shop.slug}/top-selling`,
    images: [shop.banner, shop.logo],
  });
}

export default async function TopSellingPage({ params }: Props) {
  const { shopSlug } = await params;
  const found = await getShopWithProducts(shopSlug, { topSelling: true });
  if (!found) notFound();

  return <ShopPageClient shop={found.shop} products={found.products} />;
}
