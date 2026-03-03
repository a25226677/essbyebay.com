import { notFound } from "next/navigation";
import { ShopPageClient } from "./shop-page-client";
import type { Metadata } from "next";
import { getShopWithProducts } from "@/lib/storefront-data";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shopSlug } = await params;
  const found = await getShopWithProducts(shopSlug);
  const shop = found?.shop;
  return {
    title: shop ? shop.name : "Shop Not Found",
    description: shop?.description?.slice(0, 160),
  };
}

export default async function ShopPage({ params }: Props) {
  const { shopSlug } = await params;
  const found = await getShopWithProducts(shopSlug);
  if (!found) notFound();

  return <ShopPageClient shop={found.shop} products={found.products} />;
}
