import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Open a Seller Account",
  description:
    "Apply to become a seller on Ess by Ebay and create your shop to start listing products.",
  path: "/shop/create",
  noIndex: true,
});

export default function ShopCreateLayout({ children }: { children: ReactNode }) {
  return children;
}