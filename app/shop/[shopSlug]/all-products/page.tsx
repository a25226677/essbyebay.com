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
  const found = await getShopWithProducts(shopSlug);
  const shop = found?.shop;

  if (!shop) {
    return buildMetadata({
      title: "Shop Products",
      description: "Shop products page not found.",
      path: `/shop/${shopSlug}/all-products`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${shop.name} All Products`,
    description: `Explore the complete product catalog from ${shop.name} on ESS by eBay.`,
    path: `/shop/${shop.slug}/all-products`,
    images: [shop.banner, shop.logo],
  });
}

export default async function AllProductsPage({ params }: Props) {
  const { shopSlug } = await params;
  const found = await getShopWithProducts(shopSlug);
  if (!found) notFound();

  return <ShopPageClient shop={found.shop} products={found.products} />;
}
