import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/header/mobile-bottom-nav";
import { Toaster } from "sonner";
import { ChatwayWidget } from "@/components/chatway-widget";
import { absoluteUrl, buildMetadata, seoConfig, siteUrl } from "@/lib/seo";

const defaultUrl = process.env.NEXT_PUBLIC_SITE_URL || (
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://esellersstorebay.com"
);

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: `${seoConfig.defaultTitle} | ${seoConfig.name}`,
    template: `%s | ${seoConfig.name}`,
  },
  applicationName: seoConfig.name,
  description: seoConfig.description,
  keywords: [...seoConfig.keywords],
  authors: [{ name: seoConfig.name, url: siteUrl }],
  creator: seoConfig.creator,
  publisher: seoConfig.publisher,
  category: "shopping",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: buildMetadata().openGraph,
  twitter: buildMetadata().twitter,
  robots: buildMetadata().robots,
  manifest: "/manifest.webmanifest",
  other: {
    "apple-mobile-web-app-title": seoConfig.name,
  },
};

const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-open-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: seoConfig.name,
        alternateName: seoConfig.alternateName,
        url: siteUrl,
        logo: absoluteUrl("/logo.png"),
      },
      {
        "@type": "WebSite",
        name: seoConfig.name,
        alternateName: seoConfig.alternateName,
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <html lang="en">
      <body className={`${openSans.className} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Header />
        <main className="min-h-screen pb-14 md:pb-0">{children}</main>
        <Footer />
        <MobileBottomNav />
        <Toaster position="top-right" richColors />
        <ChatwayWidget />
      </body>
    </html>
  );
}
