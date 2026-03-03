import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/types";

// ─── Official brand logos from esellerstorebay.com ────────────
// Keyed by brand slug — covers all brands in brands.json + placeholder-data
const BRAND_LOGO_MAP: Record<string, string> = {
  // Tech & Electronics
  acer:             "https://esellerstorebay.com/public/uploads/all/Qyu62ZY0ss41fWrfsn7kEDIje6fe37SO7Q8QAjN4.jpg",
  adidas:           "https://esellerstorebay.com/public/uploads/all/pnJLUOOCynVS3zcwiKKQaTfoI80XROjVbHb2HkXX.jpg",
  apple:            "https://esellerstorebay.com/public/uploads/all/OORNgOuuK7i6LpaAmneoZ7XJhyXjGhn9oM2C3sHP.jpg",
  asus:             "https://esellerstorebay.com/public/uploads/all/hKVK9fJ4AFupftAHV6fCQF3ysYfxlEXCha1NrSEH.jpg",
  samsung:          "https://esellerstorebay.com/public/uploads/all/CHiPPwWsYyBSKA86NensGpbPkF1PujSxg3UjyACn.jpg",
  sony:             "https://esellerstorebay.com/public/uploads/all/32t6dhIilYusFyl7qDNolVLppb4v9sUJxF6foHBZ.jpg",
  dell:             "https://esellerstorebay.com/public/uploads/all/cHHHavWbYah9GncgLMh2CfEl4hz801GQ1jC1zdo9.jpg",
  lenovo:           "https://esellerstorebay.com/public/uploads/all/0fuebltbHk8mgooYwGXQMw7Iq5pKkrTng9k16PjW.png",
  hp:               "https://esellerstorebay.com/public/uploads/all/LQMLgUWHTDLzZWYoojq4Cj6I12Tbp2vfC6Hq9VPi.jpg",
  microsoft:        "https://esellerstorebay.com/public/uploads/all/ZEYOuwUJBrPMBzAxhuGtVATmMWQgbs2koXL9iigk.jpg",
  lg:               "https://esellerstorebay.com/public/uploads/all/umODcXCJXRWCXrfw3FGlhkNZFXCa68V6GlK5JqNw.jpg",
  nokia:            "https://esellerstorebay.com/public/uploads/all/RFqP89uokkAJ7kdjThXpmhOVMQfozNihuJ0dTfVK.jpg",
  xiaomi:           "https://esellerstorebay.com/public/uploads/all/04SK3FuD7WvRUaQsgP9LeJepw32TMvVHrxsbn6zo.jpg",
  "one-plus":       "https://esellerstorebay.com/public/uploads/all/F0nMVGsZckKF9zvrkKlm5TJ0PJmECpgKab27A47o.jpg",
  oneplus:          "https://esellerstorebay.com/public/uploads/all/F0nMVGsZckKF9zvrkKlm5TJ0PJmECpgKab27A47o.jpg",
  google:           "https://esellerstorebay.com/public/uploads/all/hvTR2tCxrfUnjbBYbfal0St5XfSSBASaNWYRVwNF.jpg",
  canon:            "https://esellerstorebay.com/public/uploads/all/a6Up1xvLDybhNDluBNmmYt2lO7XIXnAEg7D6wkVJ.jpg",
  corsair:          "https://esellerstorebay.com/public/uploads/all/HyCiLur6BpTaXmxsO51XdeBGJlBtskbjTTEAmdAk.jpg",
  logitech:         "https://esellerstorebay.com/public/uploads/all/8pNkfmAWx4ptMdsKkFZE3OiK8EwZL9GnjUtPuF7S.jpg",
  intel:            "/images/placeholders/brand-apple.svg",
  amd:              "/images/placeholders/brand-apple.svg",
  nvidia:           "/images/placeholders/brand-apple.svg",
  msi:              "/images/placeholders/brand-apple.svg",
  jbl:              "/images/placeholders/brand-apple.svg",
  belkin:           "/images/placeholders/brand-apple.svg",
  anker:            "/images/placeholders/brand-apple.svg",
  mac:              "https://esellerstorebay.com/public/uploads/all/QGNQwT6jvTT0MqilutIlYlkOivJbY1iMZUHfEFjZ.jpg",
  beats:            "/images/placeholders/brand-apple.svg",
  // Sports & Fashion
  nike:             "https://esellerstorebay.com/public/uploads/all/TS4YAf73JiTA6k0cTuc17AZF5vApcJ06lAFLfAc2.jpg",
  puma:             "https://esellerstorebay.com/public/uploads/all/rcpEO7fXVzm4kaejPNwqw6fwyZSwJEx5zyx953QB.jpg",
  reebok:           "https://esellerstorebay.com/public/uploads/all/IhbWqyrbpQUHZd60sqz2ffGIlY5MgdhKHTZrJEVd.jpg",
  "under-armour":   "/images/placeholders/brand-apple.svg",
  gucci:            "https://esellerstorebay.com/public/uploads/all/rkyIjS3WVegrJmDqLOSE5PIpyxcBHgnKTyVDOE51.jpg",
  "ralph-lauren":   "https://esellerstorebay.com/public/uploads/all/3HnaeERBehoFSHZiEtzYhWFvfIcM3hKR33StN0u0.png",
  "calvin-klein":   "https://esellerstorebay.com/public/uploads/all/V81L322ARziA33w4Okg3yW029JtNXnLCx8nqUYe2.jpg",
  zara:             "/images/placeholders/brand-apple.svg",
  hm:               "/images/placeholders/brand-h&m.svg",
  "h&m":            "/images/placeholders/brand-h&m.svg",
  "tommy-hilfiger": "/images/placeholders/brand-apple.svg",
  "michael-kors":   "/images/placeholders/brand-apple.svg",
  levis:            "/images/placeholders/brand-apple.svg",
  "kate-spade":     "/images/placeholders/brand-apple.svg",
  columbia:         "/images/placeholders/brand-apple.svg",
  "north-face":     "/images/placeholders/brand-apple.svg",
  "victorias-secret":"https://esellerstorebay.com/public/uploads/all/rTnF7lkUo98xSabKEL33PB8Jy2wTriBdbuaEInWK.jpg",
  "urban-decay":    "https://esellerstorebay.com/public/uploads/all/26AUkrxaz6uHIX5js628FlgzxkGPaTO272uugCQd.jpg",
  coach:            "/images/placeholders/brand-apple.svg",
  guess:            "https://esellerstorebay.com/public/uploads/all/VM6VW4RtuX7SVsHmPJN5tBKFB491DM8agVksrEi7.jpg",
  wilson:           "/images/placeholders/brand-apple.svg",
  spalding:         "/images/placeholders/brand-apple.svg",
  coleman:          "/images/placeholders/brand-apple.svg",
  // Automotive
  "mercedes-benz":  "https://esellerstorebay.com/public/uploads/all/BzkZ50NsIxzdS9ToxXJzP7PV9Hk5pRshyxE73sbq.jpg",
  mercedes:         "https://esellerstorebay.com/public/uploads/all/N602WIwftMypkpk23tZljEqSXUEWKW7jwAhaMa1h.jpg",
  bmw:              "/images/placeholders/brand-bmw.svg",
  audi:             "https://esellerstorebay.com/public/uploads/all/DYRuBljh1IMi24ibQJWwyxtlbO9unim0YgVVLQO6.jpg",
  lamborghini:      "https://esellerstorebay.com/public/uploads/all/yFb3LI3H1O7u5esbgwttygD9qgNtSPe6nTWL1pZV.jpg",
  "rolls-royce":    "https://esellerstorebay.com/public/uploads/all/nh9MG1IjUQNYwECygkgSBCtLUdzpQyt9a7LEFKnb.jpg",
  ford:             "https://esellerstorebay.com/public/uploads/all/N5HzSVAmfqoflwY81P9RWJdDJ6S4mYmURIyWeqcO.jpg",
  toyota:           "https://esellerstorebay.com/public/uploads/all/BY9Ye6rjMOzVp1ukAaueI7V29XShRNJaMucauqVs.jpg",
  honda:            "/images/placeholders/brand-apple.svg",
  suzuki:           "https://esellerstorebay.com/public/uploads/all/c0I0b7h4VyhtWml1r2VfXUWJcT030iRMPo1ce8nb.jpg",
  yamaha:           "https://esellerstorebay.com/public/uploads/all/J37EphmHxcn76CVbWkMtRFxrg9ZC7D16BFghMb6F.jpg",
  "royal-enfield":  "https://esellerstorebay.com/public/uploads/all/U4eIpiFD7xSs8dC0cHJrOoKmiRyEZENgkisFJJ0s.jpg",
  volvo:            "https://esellerstorebay.com/public/uploads/all/gTCDxIFKlOwj09v3eNvHDEjWi35kLAFkYdCm06O2.jpg",
  // Watches & Jewellery
  rolex:            "https://esellerstorebay.com/public/uploads/all/yRR7j7evOm0KjGLRfCNfD7k3bGoF6Zo6yWVFGzys.png",
  omega:            "https://esellerstorebay.com/public/uploads/all/89q1phGOV0Pf0B2lqTbbHihpcW76bKy7VTDqFUk6.jpg",
  casio:            "/images/placeholders/brand-apple.svg",
  seiko:            "/images/placeholders/brand-apple.svg",
  fossil:           "/images/placeholders/brand-apple.svg",
  tiffany:          "/images/placeholders/brand-apple.svg",
  breitling:        "https://esellerstorebay.com/public/uploads/all/EmOLclj3XRc2Ng4FudSgeFc7mxH0jqZdeiRxeIkb.jpg",
  // Beauty
  "estee-lauder":   "/images/placeholders/brand-apple.svg",
  clinique:         "/images/placeholders/brand-apple.svg",
  loreal:           "/images/placeholders/brand-apple.svg",
  maybelline:       "/images/placeholders/brand-apple.svg",
  dyson:            "/images/placeholders/brand-apple.svg",
  // Toys & Kids
  hasbro:           "/images/placeholders/brand-apple.svg",
  lego:             "/images/placeholders/brand-apple.svg",
  mattel:           "/images/placeholders/brand-apple.svg",
  "hot-wheels":     "/images/placeholders/brand-apple.svg",
  "fisher-price":   "/images/placeholders/brand-apple.svg",
  giant:            "/images/placeholders/brand-apple.svg",
  // Other
  "3m":             "/images/placeholders/brand-apple.svg",
  bosch:            "/images/placeholders/brand-apple.svg",
  dewalt:           "/images/placeholders/brand-apple.svg",
  prada:            "/images/placeholders/brand-apple.svg",
  otterbox:         "/images/placeholders/brand-apple.svg",
  spigen:           "/images/placeholders/brand-apple.svg",
  // Legacy
  aigner:           "https://esellerstorebay.com/public/uploads/all/werJ5uEXwIGCN2T5yC8hStWBTK9lHaOuIfRMDNUg.jpg",
  alosa:            "https://esellerstorebay.com/public/uploads/all/oPP6xKO0Op5RjL6s23z0MO61Dx1mhCpCqKgCWqF1.jpg",
  apato:            "https://esellerstorebay.com/public/uploads/all/MqAWwfnjrVjNSgdEMeXfv5oC18HKVElmZlNxc3Z2.jpg",
  millet:           "https://esellerstorebay.com/public/uploads/all/DHZu4mN6igPh8C5QYJXDmlmY53ybdpHrhveWDzAe.jpg",
  "wood-worm":      "https://esellerstorebay.com/public/uploads/all/SdYdA5C1d5rtQIfql5lmAbDMhwoXij7ug4M3HVHm.jpg",
};

const FALLBACK_LOGO = "/images/placeholders/brand-apple.svg";

function getBrandLogoSrc(brand: { slug: string; logo: string }): string {
  // 1. If the data layer already has a real remote URL, use it
  if (brand.logo?.startsWith("http")) return brand.logo;
  // 2. Look up in slug map
  if (BRAND_LOGO_MAP[brand.slug]) return BRAND_LOGO_MAP[brand.slug];
  // 3. Use local path if provided (e.g. /images/placeholders/...)
  if (brand.logo?.startsWith("/")) return brand.logo;
  return FALLBACK_LOGO;
}

interface BrandCardProps {
  brand: Brand;
}

/**
 * BrandCard — grayscale by default, full colour + scale on hover.
 * Uses official brand logos from esellerstorebay.com.
 */
export function BrandCard({ brand }: BrandCardProps) {
  const logoSrc = getBrandLogoSrc(brand);

  return (
    <Link
      href={`/search?q=${encodeURIComponent(brand.name)}`}
      className="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-[#f77f00]/40 hover:shadow-md hover:shadow-orange-100/60 transition-all duration-300"
    >
      {/* Logo — grayscale default, full colour + scale on hover */}
      <div className="relative w-[90px] h-[52px] flex items-center justify-center">
        <Image
          src={logoSrc}
          alt={`${brand.name} logo`}
          fill
          sizes="90px"
          className="object-contain transition-all duration-300 grayscale group-hover:grayscale-0 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      {/* Brand name */}
      <span className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-800 transition-colors duration-200 tracking-wide uppercase">
        {brand.name}
      </span>
    </Link>
  );
}
