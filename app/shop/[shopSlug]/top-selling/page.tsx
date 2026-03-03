import { notFound } from "next/navigation";
import { ShopPageClient } from "../shop-page-client";
import { getShopWithProducts } from "@/lib/storefront-data";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export const metadata = { title: "Top Selling" };

export default async function TopSellingPage({ params }: Props) {
  const { shopSlug } = await params;
  const found = await getShopWithProducts(shopSlug, { topSelling: true });
  if (!found) notFound();

  return <ShopPageClient shop={found.shop} products={found.products} />;
}
