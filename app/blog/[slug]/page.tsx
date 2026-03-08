import Image from "next/image";
import { notFound } from "next/navigation";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import type { Metadata } from "next";
import { getBlogPostBySlug } from "@/lib/storefront-data";
import { buildMetadata, truncateDescription } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return buildMetadata({
      title: "Post Not Found",
      description: "The article you are looking for is unavailable or no longer exists.",
      path: `/blog/${slug}`,
      noIndex: true,
      type: "article",
    });
  }

  const metadata = buildMetadata({
    title: post.title,
    description: truncateDescription(post.excerpt || post.title),
    path: `/blog/${post.slug}`,
    images: [post.image],
    keywords: [post.author, "shopping blog", post.title],
    type: "article",
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BreadcrumbNav
        items={[
          { label: "Blog", href: "/blog" },
          { label: post.title },
        ]}
      />

      <h1 className="text-2xl md:text-3xl font-bold mb-3">{post.title}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {new Date(post.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}{" "}
        · {post.author}
      </p>

      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 mb-8">
        <Image
          src={post.image}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
          priority
        />
      </div>

      <div
        className="prose prose-sm max-w-none text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </div>
  );
}
