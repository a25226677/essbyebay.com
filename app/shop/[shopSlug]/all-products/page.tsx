import { notFound } from "next/navigation";
import { ShopPageClient } from "../shop-page-client";
import { getShopWithProducts } from "@/lib/storefront-data";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export const metadata = { title: "All Products" };

export default async function AllProductsPage({ params }: Props) {
  const { shopSlug } = await params;
  const found = await getShopWithProducts(shopSlug);
  if (!found) notFound();

  return <ShopPageClient shop={found.shop} products={found.products} />;
}
