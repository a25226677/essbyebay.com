import { ImageResponse } from "next/og";
import { seoConfig } from "@/lib/seo";

export const alt = `${seoConfig.name} social preview`;
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #171f2f 0%, #2f3b51 45%, #f77f00 100%)",
          color: "white",
          padding: 56,
          fontFamily: "Arial, sans-serif",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{seoConfig.name}</div>
            <div style={{ fontSize: 18, opacity: 0.86 }}>{seoConfig.alternateName}</div>
          </div>
          <div
            style={{
              display: "flex",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 999,
              padding: "10px 18px",
              fontSize: 18,
              opacity: 0.92,
            }}
          >
            Trusted Multi-Vendor Marketplace
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 860 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.04 }}>
            Shop top products from trusted sellers.
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.35, opacity: 0.92 }}>
            Fashion, electronics, beauty, home essentials, and more in one modern shopping destination.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
          }}
        >
          <div style={{ display: "flex", gap: 18 }}>
            <div>Fashion</div>
            <div>Electronics</div>
            <div>Beauty</div>
            <div>Home</div>
          </div>
          <div style={{ opacity: 0.9 }}>esellersstorebay.com</div>
        </div>
      </div>
    ),
    size,
  );
}