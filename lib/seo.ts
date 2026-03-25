import type { Metadata } from "next";

const fallbackSiteUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://esellersstorebay.com";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl;

export const seoConfig = {
  name: "ESS by eBay",
  alternateName: "eSeller Store Bay",
  defaultTitle: "Multi-Vendor Marketplace for Fashion, Electronics and More",
  description:
    "Shop fashion, electronics, beauty, home essentials, and more on ESS by eBay, a modern multi-vendor marketplace connecting buyers with trusted sellers.",
  locale: "en_US",
  creator: "ESS by eBay",
  publisher: "ESS by eBay",
  themeColor: "#2f3b51",
  defaultOgImage: "/opengraph-image?v=2",
  keywords: [
    "ESS by eBay",
    "eSeller Store Bay",
    "multi-vendor marketplace",
    "online shopping",
    "fashion store",
    "electronics store",
    "beauty products",
    "home essentials",
    "trusted sellers",
  ],
} as const;

type MetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  images?: string[];
  noIndex?: boolean;
  type?: "website" | "article";
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, siteUrl).toString();
}

export function truncateDescription(value: string | null | undefined, max = 160) {
  const text = value?.replace(/\s+/g, " ").trim() || "";
  if (!text) {
    return seoConfig.description;
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function resolveSeoTitle(title?: string) {
  return title ? `${title} | ${seoConfig.name}` : `${seoConfig.defaultTitle} | ${seoConfig.name}`;
}

function buildRobots(noIndex = false): Metadata["robots"] {
  if (noIndex) {
    return {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    };
  }

  return {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

export function buildMetadata(options: MetadataOptions = {}): Metadata {
  const {
    title,
    description = seoConfig.description,
    path = "/",
    keywords = [],
    images = [seoConfig.defaultOgImage],
    noIndex = false,
    type = "website",
  } = options;

  const canonical = absoluteUrl(path);
  const resolvedTitle = resolveSeoTitle(title);
  const resolvedDescription = truncateDescription(description);
  const resolvedImages = images.map((image) => absoluteUrl(image));

  return {
    title: title || seoConfig.defaultTitle,
    description: resolvedDescription,
    keywords: [...seoConfig.keywords, ...keywords],
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      siteName: seoConfig.name,
      locale: seoConfig.locale,
      images: resolvedImages.map((url) => ({ url })),
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      creator: seoConfig.creator,
      images: resolvedImages,
    },
    robots: buildRobots(noIndex),
  };
}

export const noIndexMetadata = buildMetadata({
  title: seoConfig.name,
  noIndex: true,
});