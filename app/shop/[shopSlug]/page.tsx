import { notFound } from "next/navigation";
import { ShopPageClient } from "./shop-page-client";
import type { Metadata } from "next";
import { getShopWithProducts } from "@/lib/storefront-data";
import { buildMetadata, truncateDescription } from "@/lib/seo";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shopSlug } = await params;
  const found = await getShopWithProducts(shopSlug);
  const shop = found?.shop;

  if (!shop) {
    return buildMetadata({
      title: "Shop Not Found",
      description: "The shop you are looking for is unavailable or no longer exists.",
      path: `/shop/${shopSlug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: shop.name,
    description: truncateDescription(
      shop.description || `${shop.name} on Ess by Ebay with products from a trusted marketplace seller.`,
    ),
    path: `/shop/${shop.slug}`,
    images: [shop.banner, shop.logo],
    keywords: [shop.name, "marketplace seller", "shop online"],
  });
}

export default async function ShopPage({ params }: Props) {
  const { shopSlug } = await params;
  const found = await getShopWithProducts(shopSlug);
  if (!found) notFound();

  return <ShopPageClient shop={found.shop} products={found.products} />;
}
