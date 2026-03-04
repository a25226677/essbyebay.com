"use client";

import { useState } from "react";
import Link from "next/link";
import type { Brand } from "@/lib/types";

// ─── Brand slug → official website domain ─────────────────────
// Used for apple-touch-icon + DuckDuckGo icon fallbacks
const BRAND_DOMAINS: Record<string, string> = {
  "3m": "3m.com",
  acer: "acer.com",
  adidas: "adidas.com",
  amd: "amd.com",
  anker: "anker.com",
  apple: "apple.com",
  asus: "asus.com",
  beats: "beatsbydre.com",
  belkin: "belkin.com",
  bmw: "bmw.com",
  bosch: "bosch.com",
  breitling: "breitling.com",
  "calvin-klein": "calvinklein.com",
  canon: "canon.com",
  casio: "casio.com",
  clinique: "clinique.com",
  coach: "coach.com",
  coleman: "coleman.com",
  columbia: "columbia.com",
  corsair: "corsair.com",
  dell: "dell.com",
  dewalt: "dewalt.com",
  dyson: "dyson.com",
  "estee-lauder": "esteelauder.com",
  "fisher-price": "fisher-price.com",
  ford: "ford.com",
  fossil: "fossil.com",
  giant: "giant-bicycles.com",
  google: "google.com",
  gucci: "gucci.com",
  guess: "guess.com",
  "h&m": "hm.com",
  hm: "hm.com",
  hasbro: "hasbro.com",
  honda: "honda.com",
  "hot-wheels": "hotwheels.mattel.com",
  hp: "hp.com",
  intel: "intel.com",
  jbl: "jbl.com",
  "kate-spade": "katespade.com",
  lamborghini: "lamborghini.com",
  lego: "lego.com",
  lenovo: "lenovo.com",
  levis: "levi.com",
  lg: "lg.com",
  logitech: "logitech.com",
  loreal: "loreal.com",
  mac: "maccosmetics.com",
  mattel: "mattel.com",
  maybelline: "maybelline.com",
  "mercedes-benz": "mercedes-benz.com",
  mercedes: "mercedes-benz.com",
  "michael-kors": "michaelkors.com",
  microsoft: "microsoft.com",
  msi: "msi.com",
  nike: "nike.com",
  nokia: "nokia.com",
  "north-face": "thenorthface.com",
  nvidia: "nvidia.com",
  omega: "omegawatches.com",
  "one-plus": "oneplus.com",
  oneplus: "oneplus.com",
  otterbox: "otterbox.com",
  prada: "prada.com",
  puma: "puma.com",
  "ralph-lauren": "ralphlauren.com",
  reebok: "reebok.com",
  rolex: "rolex.com",
  "rolls-royce": "rolls-roycemotorcars.com",
  "royal-enfield": "royalenfield.com",
  samsung: "samsung.com",
  seiko: "seikowatches.com",
  sony: "sony.com",
  spalding: "spalding.com",
  spigen: "spigen.com",
  suzuki: "suzuki.com",
  tiffany: "tiffany.com",
  "tommy-hilfiger": "tommy.com",
  toyota: "toyota.com",
  "under-armour": "underarmour.com",
  "urban-decay": "urbandecay.com",
  "victorias-secret": "victoriassecret.com",
  volvo: "volvo.com",
  wilson: "wilson.com",
  xiaomi: "xiaomi.com",
  yamaha: "yamaha.com",
  zara: "zara.com",
  // Legacy
  aigner: "aigner.com",
  alosa: "alosa.de",
  apato: "apato.com",
  millet: "millet.fr",
  "wood-worm": "woodworm.tv",
};

// ─── Simple Icons CDN slug overrides ──────────────────────────
const SI_OVERRIDES: Record<string, string> = {
  beats: "beatsbydre",
  "calvin-klein": "calvinklein",
  "h&m": "hm",
  hm: "hm",
  "kate-spade": "katespade",
  "michael-kors": "michaelkors",
  "north-face": "thenorthface",
  "ralph-lauren": "ralphlauren",
  "tommy-hilfiger": "tommyhilfiger",
  "under-armour": "underarmour",
  "victorias-secret": "victoriassecret",
  "urban-decay": "urbandecay",
  "estee-lauder": "esteelauder",
  "fisher-price": "fisherprice",
  "hot-wheels": "hotwheels",
  "mercedes-benz": "mercedesbenz",
  "rolls-royce": "rollsroyce",
  "royal-enfield": "royalenfield",
  "one-plus": "oneplus",
  "wood-worm": "woodworm",
  mac: "maccosmetics",
};

// ─── Generate consistent color from brand name ────────────────
function brandColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 45%)`;
}

function getSimpleIconsSlug(slug: string): string {
  return SI_OVERRIDES[slug] || slug.replace(/-/g, "");
}

function getBrandDomain(slug: string): string {
  return BRAND_DOMAINS[slug] || `${slug.replace(/-/g, "")}.com`;
}

interface BrandCardProps {
  brand: Brand;
}

/**
 * BrandCard — cascading logo sources with graceful fallback.
 *
 * Priority:
 *  1. Database URL (Supabase storage or any real http URL)
 *  2. Simple Icons CDN (high-quality SVG in brand colors)
 *  3. Brand website apple-touch-icon (180×180 PNG — most major sites have this)
 *  4. DuckDuckGo instant icons (reliable, good quality)
 *  5. CSS branded initial — guarantees no broken images ever
 */
export function BrandCard({ brand }: BrandCardProps) {
  const [failCount, setFailCount] = useState(0);

  const siSlug = getSimpleIconsSlug(brand.slug);
  const domain = getBrandDomain(brand.slug);

  // Build ordered list of sources to try
  const sources: (string | null)[] = [];

  // 1. Try the DB URL if it's a real http URL (Supabase storage, etc.)
  //    Skip known-dead CDNs and SimpleIcons (handled separately below)
  if (
    brand.logo?.startsWith("http") &&
    !brand.logo.includes("logo.clearbit.com") &&
    !brand.logo.includes("esellerstorebay.com") &&
    !brand.logo.includes("cdn.simpleicons.org")
  ) {
    sources.push(brand.logo);
  }

  // 2. Simple Icons CDN — official brand-color SVGs (404 for unknown brands → onError)
  sources.push(`https://cdn.simpleicons.org/${siSlug}`);

  // 3. Brand website apple-touch-icon — 180×180 high-quality PNG
  //    Virtually all major brand websites serve this; 404 triggers onError
  sources.push(`https://www.${domain}/apple-touch-icon.png`);

  // 4. DuckDuckGo instant icons — returns decent quality for most domains
  sources.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);

  // 5. CSS text fallback (null sentinel)
  sources.push(null);

  const currentUrl = sources[Math.min(failCount, sources.length - 1)];
  const initial = brand.name?.charAt(0)?.toUpperCase() || "?";
  const bgColor = brandColor(brand.name);

  // Advance to next source on load error
  const handleError = () => setFailCount((c) => c + 1);

  // Skip images that loaded but are too small (< 32px) — likely generic placeholders
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalWidth < 32) {
      setFailCount((c) => c + 1);
    }
  };

  return (
    <Link
      href={`/search?q=${encodeURIComponent(brand.name)}`}
      className="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-[#f77f00]/40 hover:shadow-md hover:shadow-orange-100/60 transition-all duration-300"
    >
      <div className="relative w-[90px] h-[52px] flex items-center justify-center overflow-hidden">
        {currentUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={currentUrl}
            alt={`${brand.name} logo`}
            onError={handleError}
            onLoad={handleLoad}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full object-contain transition-all duration-300 grayscale group-hover:grayscale-0 group-hover:scale-110"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center rounded-lg text-white font-bold text-xl tracking-wider transition-transform duration-300 group-hover:scale-110 select-none"
            style={{ backgroundColor: bgColor }}
          >
            {initial}
          </div>
        )}
      </div>
      {/* Brand name */}
      <span className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-800 transition-colors duration-200 tracking-wide uppercase">
        {brand.name}
      </span>
    </Link>
  );
}
