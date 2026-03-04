"use client";

import { useState } from "react";
import Link from "next/link";
import type { Brand } from "@/lib/types";

<<<<<<< HEAD
// ─── Brand slug → official website domain ─────────────────────
// Used for Google favicon fallback: google.com/s2/favicons?domain=X&sz=128
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
// Only needed when brand slug differs from simpleicons.org slug
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
=======
// ─── Reliable brand logos via Clearbit Logo API ───────────────
// Format: https://logo.clearbit.com/<domain>
// Keyed by brand slug — covers all storefront brands
const BRAND_LOGO_MAP: Record<string, string> = {
  // Tech & Electronics
  "3m":             "https://logo.clearbit.com/3m.com",
  acer:             "https://logo.clearbit.com/acer.com",
  amd:              "https://logo.clearbit.com/amd.com",
  anker:            "https://logo.clearbit.com/anker.com",
  apple:            "https://logo.clearbit.com/apple.com",
  asus:             "https://logo.clearbit.com/asus.com",
  beats:            "https://logo.clearbit.com/beatsbydre.com",
  belkin:           "https://logo.clearbit.com/belkin.com",
  bosch:            "https://logo.clearbit.com/bosch.com",
  canon:            "https://logo.clearbit.com/canon.com",
  corsair:          "https://logo.clearbit.com/corsair.com",
  dell:             "https://logo.clearbit.com/dell.com",
  dewalt:           "https://logo.clearbit.com/dewalt.com",
  dyson:            "https://logo.clearbit.com/dyson.com",
  google:           "https://logo.clearbit.com/google.com",
  hp:               "https://logo.clearbit.com/hp.com",
  intel:            "https://logo.clearbit.com/intel.com",
  jbl:              "https://logo.clearbit.com/jbl.com",
  lenovo:           "https://logo.clearbit.com/lenovo.com",
  lg:               "https://logo.clearbit.com/lg.com",
  logitech:         "https://logo.clearbit.com/logitech.com",
  microsoft:        "https://logo.clearbit.com/microsoft.com",
  msi:              "https://logo.clearbit.com/msi.com",
  nokia:            "https://logo.clearbit.com/nokia.com",
  nvidia:           "https://logo.clearbit.com/nvidia.com",
  "one-plus":       "https://logo.clearbit.com/oneplus.com",
  oneplus:          "https://logo.clearbit.com/oneplus.com",
  samsung:          "https://logo.clearbit.com/samsung.com",
  sony:             "https://logo.clearbit.com/sony.com",
  spigen:           "https://logo.clearbit.com/spigen.com",
  xiaomi:           "https://logo.clearbit.com/xiaomi.com",
  otterbox:         "https://logo.clearbit.com/otterbox.com",

  // Sports & Fashion
  adidas:           "https://logo.clearbit.com/adidas.com",
  "calvin-klein":   "https://logo.clearbit.com/calvinklein.com",
  coach:            "https://logo.clearbit.com/coach.com",
  columbia:         "https://logo.clearbit.com/columbia.com",
  gucci:            "https://logo.clearbit.com/gucci.com",
  guess:            "https://logo.clearbit.com/guess.com",
  hm:               "https://logo.clearbit.com/hm.com",
  "h&m":            "https://logo.clearbit.com/hm.com",
  "kate-spade":     "https://logo.clearbit.com/katespade.com",
  levis:            "https://logo.clearbit.com/levi.com",
  "michael-kors":   "https://logo.clearbit.com/michaelkors.com",
  nike:             "https://logo.clearbit.com/nike.com",
  "north-face":     "https://logo.clearbit.com/thenorthface.com",
  prada:            "https://logo.clearbit.com/prada.com",
  puma:             "https://logo.clearbit.com/puma.com",
  "ralph-lauren":   "https://logo.clearbit.com/ralphlauren.com",
  reebok:           "https://logo.clearbit.com/reebok.com",
  "tommy-hilfiger": "https://logo.clearbit.com/tommy.com",
  "under-armour":   "https://logo.clearbit.com/underarmour.com",
  "victorias-secret":"https://logo.clearbit.com/victoriassecret.com",
  "urban-decay":    "https://logo.clearbit.com/urbandecay.com",
  zara:             "https://logo.clearbit.com/zara.com",
  wilson:           "https://logo.clearbit.com/wilson.com",
  spalding:         "https://logo.clearbit.com/spalding.com",
  coleman:          "https://logo.clearbit.com/coleman.com",

  // Automotive
  audi:             "https://logo.clearbit.com/audi.com",
  bmw:              "https://logo.clearbit.com/bmw.com",
  ford:             "https://logo.clearbit.com/ford.com",
  honda:            "https://logo.clearbit.com/honda.com",
  lamborghini:      "https://logo.clearbit.com/lamborghini.com",
  "mercedes-benz":  "https://logo.clearbit.com/mercedes-benz.com",
  mercedes:         "https://logo.clearbit.com/mercedes-benz.com",
  "rolls-royce":    "https://logo.clearbit.com/rolls-roycemotorcars.com",
  "royal-enfield":  "https://logo.clearbit.com/royalenfield.com",
  suzuki:           "https://logo.clearbit.com/suzuki.com",
  toyota:           "https://logo.clearbit.com/toyota.com",
  volvo:            "https://logo.clearbit.com/volvo.com",
  yamaha:           "https://logo.clearbit.com/yamaha.com",

  // Watches & Jewellery
  breitling:        "https://logo.clearbit.com/breitling.com",
  casio:            "https://logo.clearbit.com/casio.com",
  fossil:           "https://logo.clearbit.com/fossil.com",
  omega:            "https://logo.clearbit.com/omegawatches.com",
  rolex:            "https://logo.clearbit.com/rolex.com",
  seiko:            "https://logo.clearbit.com/seikowatches.com",
  tiffany:          "https://logo.clearbit.com/tiffany.com",

  // Beauty & Personal Care
  clinique:         "https://logo.clearbit.com/clinique.com",
  "estee-lauder":   "https://logo.clearbit.com/esteelauder.com",
  loreal:           "https://logo.clearbit.com/loreal.com",
  mac:              "https://logo.clearbit.com/maccosmetics.com",
  maybelline:       "https://logo.clearbit.com/maybelline.com",

  // Toys & Kids
  "fisher-price":   "https://logo.clearbit.com/fisher-price.com",
  giant:            "https://logo.clearbit.com/giant-bicycles.com",
  hasbro:           "https://logo.clearbit.com/hasbro.com",
  "hot-wheels":     "https://logo.clearbit.com/hotwheels.mattel.com",
  lego:             "https://logo.clearbit.com/lego.com",
  mattel:           "https://logo.clearbit.com/mattel.com",

  // Legacy brands (keep esellerstorebay URLs as they were verified)
  aigner:           "https://esellerstorebay.com/public/uploads/all/werJ5uEXwIGCN2T5yC8hStWBTK9lHaOuIfRMDNUg.jpg",
  alosa:            "https://esellerstorebay.com/public/uploads/all/oPP6xKO0Op5RjL6s23z0MO61Dx1mhCpCqKgCWqF1.jpg",
  apato:            "https://esellerstorebay.com/public/uploads/all/MqAWwfnjrVjNSgdEMeXfv5oC18HKVElmZlNxc3Z2.jpg",
  millet:           "https://esellerstorebay.com/public/uploads/all/DHZu4mN6igPh8C5QYJXDmlmY53ybdpHrhveWDzAe.jpg",
  "wood-worm":      "https://esellerstorebay.com/public/uploads/all/SdYdA5C1d5rtQIfql5lmAbDMhwoXij7ug4M3HVHm.jpg",
};


function getBrandLogoSrc(brand: { slug: string; logo: string }): string {
  // 1. Always prefer our curated slug map (Clearbit CDN – most reliable)
  if (BRAND_LOGO_MAP[brand.slug]) return BRAND_LOGO_MAP[brand.slug];
  // 2. If the data layer has a real remote URL, try it
  if (brand.logo?.startsWith("http")) return brand.logo;
  // 3. Try Clearbit as a dynamic fallback using the slug as domain hint
  const guess = `https://logo.clearbit.com/${brand.slug.replace(/-/g, "")}.com`;
  return guess;
>>>>>>> 85084d035d77697eb8ace6a69e5e1d6d4962ebb0
}

interface BrandCardProps {
  brand: Brand;
}

/**
<<<<<<< HEAD
 * BrandCard — cascading logo sources with graceful fallback.
 *
 * Priority:
 *  1. Database URL (Supabase storage or any real http URL)
 *  2. Simple Icons CDN (high-quality SVG in brand colors)
 *  3. Google Favicon service (128px, works for any domain)
 *  4. CSS branded initial — guarantees no broken images ever
=======
 * BrandCard — grayscale by default, full colour + scale on hover.
 * Uses official brand logos from Clearbit Logo API.
>>>>>>> 85084d035d77697eb8ace6a69e5e1d6d4962ebb0
 */
export function BrandCard({ brand }: BrandCardProps) {
  const [failCount, setFailCount] = useState(0);

  const siSlug = getSimpleIconsSlug(brand.slug);
  const domain = getBrandDomain(brand.slug);

  // Build ordered list of sources to try
  const sources: (string | null)[] = [];

  // 1. Try the DB URL if it's a real http URL (Supabase, etc.)
  //    Skip known-dead hosts and local placeholders
  if (
    brand.logo?.startsWith("http") &&
    !brand.logo.includes("logo.clearbit.com") &&
    !brand.logo.includes("esellerstorebay.com")
  ) {
    sources.push(brand.logo);
  }

  // 2. Simple Icons CDN — official brand-color SVGs for thousands of brands
  sources.push(`https://cdn.simpleicons.org/${siSlug}`);

  // 3. Google Favicon V2 — reliable 128px icons for ANY domain
  sources.push(
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
  );

  // 4. CSS text fallback (null sentinel)
  sources.push(null);

  const currentUrl = sources[Math.min(failCount, sources.length - 1)];
  const initial = brand.name?.charAt(0)?.toUpperCase() || "?";
  const bgColor = brandColor(brand.name);

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
            onError={() => setFailCount((c) => c + 1)}
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
