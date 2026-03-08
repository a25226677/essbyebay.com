import type { MetadataRoute } from "next";
import { seoConfig } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: seoConfig.name,
    short_name: seoConfig.name,
    description: seoConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: seoConfig.themeColor,
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}