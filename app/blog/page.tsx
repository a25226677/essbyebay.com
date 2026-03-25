import Image from "next/image";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { getBlogPosts } from "@/lib/storefront-data";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Shopping Blog and Marketplace News",
  description:
    "Read shopping guides, seller tips, product trends, and marketplace updates from ESS by eBay.",
  path: "/blog",
  keywords: ["shopping blog", "marketplace news", "product guides", "seller tips"],
});

export default async function BlogListingPage() {
  const blogPosts = await getBlogPosts();

  return (
    <div className="store-page-bg">
      <div className="store-page-container py-8">
        <BreadcrumbNav items={[{ label: "Blog" }]} />
        <h1 className="text-2xl font-bold mb-6">Blog</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <article
              key={post.id}
              className="store-surface overflow-hidden transition-shadow hover:shadow-md"
            >
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="relative aspect-video bg-muted/60">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="font-semibold text-base hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · {post.author}
                </p>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                  {post.excerpt}
                </p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="inline-block text-sm text-primary hover:underline mt-3"
                >
                  Read More →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
