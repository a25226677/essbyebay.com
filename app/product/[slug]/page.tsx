import { notFound } from "next/navigation";
import { ProductDetailClient } from "./product-detail-client";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/storefront-data";
import { buildMetadata, truncateDescription } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await getProductBySlug(slug);
  const product = found?.product;

  if (!product) {
    return buildMetadata({
      title: "Product Not Found",
      description: "The product you are looking for is unavailable or no longer exists.",
      path: `/product/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: product.title,
    description: truncateDescription(product.description || product.title),
    path: `/product/${product.slug}`,
    images: [product.image],
    keywords: [product.categoryName, product.brand, product.title],
  });
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
