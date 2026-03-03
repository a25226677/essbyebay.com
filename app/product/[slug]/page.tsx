import { notFound } from "next/navigation";
import { ProductDetailClient } from "./product-detail-client";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/storefront-data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await getProductBySlug(slug);
  const product = found?.product;
  return {
    title: product ? product.title : "Product Not Found",
    description: product?.title,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const found = await getProductBySlug(slug);
  if (!found) notFound();

  return (
    <ProductDetailClient
      product={found.product}
      relatedProducts={found.relatedProducts}
    />
  );
}
