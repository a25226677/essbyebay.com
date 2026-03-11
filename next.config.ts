import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        // Allow all HTTPS image sources
        protocol: "https",
        hostname: "**",
      },
      {
        // Allow all HTTP image sources
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "i.ebayimg.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      },
      {
        // Simple Icons CDN — free SVG brand logos for BrandCard
        protocol: "https",
        hostname: "cdn.simpleicons.org",
      },
      {
        // Google Favicon V2 — fallback brand icons
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons**",
      },
      {
        // Google Favicon V2 redirect target
        protocol: "https",
        hostname: "t0.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "t1.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "t2.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "t3.gstatic.com",
      },
      {
        // Official brand logos hosted on esellersstorebay.com
        protocol: "https",
        hostname: "esellersstorebay.com",
        pathname: "/public/uploads/**",
      },
      {
        // Supabase Storage — covers all project bucket URLs
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Supabase Storage alternate subdomain pattern
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Wikimedia Commons — brand logos from SQL update script
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        // World Vector Logo CDN — brand logos from SQL update script
        protocol: "https",
        hostname: "cdn.worldvectorlogo.com",
      },
    ],
  },
  // Production hardening
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;
