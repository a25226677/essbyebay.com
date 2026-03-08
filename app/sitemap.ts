import type { MetadataRoute } from "next";
import { createAdminServiceClient } from "@/lib/supabase/admin-client";
import { absoluteUrl } from "@/lib/seo";

const staticRoutes = [
  "/",
  "/categories",
  "/brands",
  "/blog",
  "/today-deals",
  "/flash-deals",
  "/affiliate",
  "/privacy-policy",
  "/return-policy",
  "/support-policy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = createAdminServiceClient();

  const [productsResult, shopsResult, postsResult] = await Promise.all([
    db.from("products").select("slug, updated_at").eq("is_active", true),
    db.from("shops").select("slug, updated_at"),
    db
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("is_published", true),
  ]);

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = (productsResult.data || []).map((product) => ({
    url: absoluteUrl(`/product/${product.slug}`),
    lastModified: product.updated_at || new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const shopEntries: MetadataRoute.Sitemap = (shopsResult.data || []).map((shop) => ({
    url: absoluteUrl(`/shop/${shop.slug}`),
    lastModified: shop.updated_at || new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const postEntries: MetadataRoute.Sitemap = (postsResult.data || []).map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: post.updated_at || post.published_at || new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticEntries, ...productEntries, ...shopEntries, ...postEntries];
}