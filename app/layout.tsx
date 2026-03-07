import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/header/mobile-bottom-nav";
import { Toaster } from "sonner";
import { ChatwayWidget } from "@/components/chatway-widget";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "Seller Store — Multi-Vendor eCommerce Marketplace",
    template: "%s | Seller Store",
  },
  description:
    "Modern multi-vendor eCommerce marketplace connecting customers with trusted sellers. Shop fashion, electronics, beauty & more.",
  keywords: [
    "ecommerce",
    "marketplace",
    "multi-vendor",
    "online shopping",
    "seller store",
  ],
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
  return (
    <html lang="en">
      <body className={`${openSans.className} antialiased`}>
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
