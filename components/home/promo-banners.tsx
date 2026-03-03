"use client";

import Image from "next/image";
import Link from "next/link";

const promoBanners = {
  row1: [
    {
      id: "promo-1",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80",
      link: "/search?q=laptops",
      alt: "Laptops Sale",
      label: "Laptops Sale",
      sub: "Up to 40% off top brands",
      cta: "Shop Now",
      overlay: "from-blue-900/80 to-blue-600/30",
    },
    {
      id: "promo-2",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
      link: "/search?q=gadgets",
      alt: "Your Favorite Gadget",
      label: "Your Favorite Gadget",
      sub: "Discover the latest tech",
      cta: "Explore",
      overlay: "from-purple-900/80 to-purple-500/30",
    },
  ],
  fullWidth: {
    id: "promo-3",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=80",
    link: "/search?q=automobile",
    alt: "Maximum Engine Performance",
    label: "MAXIMUM ENGINE PERFORMANCE",
    sub: "Premium auto parts & accessories for every build",
    cta: "Shop Automotive",
    overlay: "from-gray-900/85 to-gray-700/30",
  },
};

export function PromoBanners() {
  return (
    <div className="max-w-[1340px] mx-auto px-4 space-y-3 py-3">
      {/* Two banners side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {promoBanners.row1.map((banner) => (
          <Link key={banner.id} href={banner.link} className="block overflow-hidden rounded group">
            <div className="relative aspect-[2.3/1] bg-gray-900">
              <Image
                src={banner.image}
                alt={banner.alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-[1.04] transition-transform duration-500"
              />
              <div className={`absolute inset-0 bg-gradient-to-r ${banner.overlay} flex flex-col justify-center px-8`}>
                <h3 className="text-white text-2xl font-extrabold mb-1 drop-shadow-lg tracking-wide">{banner.label}</h3>
                <p className="text-white/80 text-sm mb-4 drop-shadow">{banner.sub}</p>
                <span className="inline-block bg-white text-gray-900 text-xs font-bold px-4 py-1.5 rounded w-fit uppercase tracking-wider group-hover:bg-[#f77f00] group-hover:text-white transition-colors duration-200">
                  {banner.cta}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Full-width banner */}
      <Link href={promoBanners.fullWidth.link} className="block overflow-hidden rounded group">
        <div className="relative aspect-[4.2/1] bg-gray-900">
          <Image
            src={promoBanners.fullWidth.image}
            alt={promoBanners.fullWidth.alt}
            fill
            sizes="100vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-500"
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${promoBanners.fullWidth.overlay} flex flex-col justify-center px-12`}>
            <h3 className="text-white text-3xl font-extrabold mb-1 drop-shadow-lg uppercase tracking-widest">{promoBanners.fullWidth.label}</h3>
            <p className="text-white/75 text-sm mb-5 drop-shadow max-w-md">{promoBanners.fullWidth.sub}</p>
            <span className="inline-block bg-[#f77f00] text-white text-xs font-bold px-5 py-2 rounded w-fit uppercase tracking-wider group-hover:bg-white group-hover:text-gray-900 transition-colors duration-200">
              {promoBanners.fullWidth.cta}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
