// ─────────────────────────────────────────────────────────────
// lib/placeholder-data.ts — Mock data for Seller Store
// Images utilize local assets in public/images/placeholders
// ─────────────────────────────────────────────────────────────

import type {
  Product,
  Category,
  Brand,
  BannerSlide,
  FlashDeal,
  BlogPost,
  Shop,
  Seller,
} from "./types";

// ─── Shared Sellers ───────────────────────────────────────────

const sellers: Record<string, Seller> = {
  inhouse: {
    id: "s1",
    name: "Inhouse Product",
    slug: "inhouse-product",
    logo: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&q=80",
    rating: 4.5,
    productCount: 150,
  },
  jwsCollections: {
    id: "s2",
    name: "JWS Collections",
    slug: "jws-collections",
    logo: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&q=80",
    rating: 4.7,
    productCount: 85,
  },
  techVault: {
    id: "s3",
    name: "Tech Vault",
    slug: "tech-vault",
    logo: "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=400&q=80",
    rating: 4.3,
    productCount: 63,
  },
  luxuryFinds: {
    id: "s4",
    name: "Luxury Finds",
    slug: "luxury-finds",
    logo: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
    rating: 4.8,
    productCount: 42,
  },
};

// ─── Categories ───────────────────────────────────────────────

export const categories: Category[] = [
  {
    id: "cat-1",
    name: "Women Clothing & Fashion",
    slug: "women-clothing-fashion",
    icon: "Shirt",
    image: "https://images.unsplash.com/photo-1503342452485-86f7b35b6b62?w=1200&q=80",
    productCount: 45,
  },
  {
    id: "cat-2",
    name: "Computer & Accessories",
    slug: "computer-accessories",
    icon: "Monitor",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&q=80",
    productCount: 32,
  },
  {
    id: "cat-3",
    name: "Kids & Toy",
    slug: "kids-toy",
    icon: "Baby",
    image: "https://images.unsplash.com/photo-1520975913421-0b0fb6f2f5e4?w=1200&q=80",
    productCount: 28,
  },
  {
    id: "cat-4",
    name: "Sports & Outdoor",
    slug: "sports-outdoor",
    icon: "Dumbbell",
    image: "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?w=1200&q=80",
    productCount: 35,
  },
  {
    id: "cat-5",
    name: "Automobile & Motorcycle",
    slug: "automobile-motorcycle",
    icon: "Car",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1400&q=80",
    productCount: 12,
  },
  {
    id: "cat-6",
    name: "Phone Accessories",
    slug: "phone-accessories",
    icon: "Smartphone",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80",
    productCount: 20,
  },
  {
    id: "cat-7",
    name: "Women's Fashion Bag",
    slug: "womens-fashion-bag",
    icon: "ShoppingBag",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80",
    productCount: 38,
  },
  {
    id: "cat-8",
    name: "Beauty, Health & Hair",
    slug: "beauty-health-hair",
    icon: "Sparkles",
    image: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=1200&q=80",
    productCount: 25,
  },
  {
    id: "cat-9",
    name: "Jewelry & Watches",
    slug: "jewelry-watches",
    icon: "Watch",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&q=80",
    productCount: 30,
  },
  {
    id: "cat-10",
    name: "Men Clothing & Fashion",
    slug: "men-clothing-fashion",
    icon: "Shirt",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1200&q=80",
    productCount: 40,
  },
];

// ─── Brands ───────────────────────────────────────────────────
<<<<<<< HEAD
// Logos resolved dynamically in BrandCard via Simple Icons CDN + Google Favicon fallback
// The `logo` field is a hint; the component handles broken URLs gracefully.

export const brands: Brand[] = [
  { id: "b-1",  name: "ACER",             slug: "acer",             logo: "https://cdn.simpleicons.org/acer" },
  { id: "b-2",  name: "Adidas",           slug: "adidas",           logo: "https://cdn.simpleicons.org/adidas" },
  { id: "b-3",  name: "Apple",            slug: "apple",            logo: "https://cdn.simpleicons.org/apple" },
  { id: "b-4",  name: "ASUS",             slug: "asus",             logo: "https://cdn.simpleicons.org/asus" },
  { id: "b-5",  name: "Samsung",          slug: "samsung",          logo: "https://cdn.simpleicons.org/samsung" },
  { id: "b-6",  name: "Sony",             slug: "sony",             logo: "https://cdn.simpleicons.org/sony" },
  { id: "b-7",  name: "Dell",             slug: "dell",             logo: "https://cdn.simpleicons.org/dell" },
  { id: "b-8",  name: "Lenovo",           slug: "lenovo",           logo: "https://cdn.simpleicons.org/lenovo" },
  { id: "b-9",  name: "HP",               slug: "hp",               logo: "https://cdn.simpleicons.org/hp" },
  { id: "b-10", name: "Nike",             slug: "nike",             logo: "https://cdn.simpleicons.org/nike" },
  { id: "b-11", name: "Puma",             slug: "puma",             logo: "https://cdn.simpleicons.org/puma" },
  { id: "b-12", name: "Reebok",           slug: "reebok",           logo: "https://cdn.simpleicons.org/reebok" },
  { id: "b-13", name: "Gucci",            slug: "gucci",            logo: "https://cdn.simpleicons.org/gucci" },
  { id: "b-14", name: "Ralph Lauren",     slug: "ralph-lauren",     logo: "https://cdn.simpleicons.org/ralphlauren" },
  { id: "b-15", name: "Calvin Klein",     slug: "calvin-klein",     logo: "https://cdn.simpleicons.org/calvinklein" },
  { id: "b-16", name: "Yamaha",           slug: "yamaha",           logo: "https://cdn.simpleicons.org/yamaha" },
  { id: "b-17", name: "Rolex",            slug: "rolex",            logo: "https://cdn.simpleicons.org/rolex" },
  { id: "b-18", name: "Canon",            slug: "canon",            logo: "https://cdn.simpleicons.org/canon" },
  { id: "b-19", name: "Corsair",          slug: "corsair",          logo: "https://cdn.simpleicons.org/corsair" },
  { id: "b-20", name: "Logitech",         slug: "logitech",         logo: "https://cdn.simpleicons.org/logitech" },
  { id: "b-21", name: "Microsoft",        slug: "microsoft",        logo: "https://cdn.simpleicons.org/microsoft" },
  { id: "b-22", name: "LG",               slug: "lg",               logo: "https://cdn.simpleicons.org/lg" },
  { id: "b-23", name: "Nokia",            slug: "nokia",            logo: "https://cdn.simpleicons.org/nokia" },
  { id: "b-24", name: "Xiaomi",           slug: "xiaomi",           logo: "https://cdn.simpleicons.org/xiaomi" },
  { id: "b-25", name: "OnePlus",          slug: "one-plus",         logo: "https://cdn.simpleicons.org/oneplus" },
  { id: "b-26", name: "Mercedes-Benz",    slug: "mercedes-benz",    logo: "https://cdn.simpleicons.org/mercedesbenz" },
  { id: "b-27", name: "BMW",              slug: "bmw",              logo: "https://cdn.simpleicons.org/bmw" },
  { id: "b-28", name: "Audi",             slug: "audi",             logo: "https://cdn.simpleicons.org/audi" },
  { id: "b-29", name: "Lamborghini",      slug: "lamborghini",      logo: "https://cdn.simpleicons.org/lamborghini" },
  { id: "b-30", name: "Rolls-Royce",      slug: "rolls-royce",      logo: "https://cdn.simpleicons.org/rollsroyce" },
  { id: "b-31", name: "Ford",             slug: "ford",             logo: "https://cdn.simpleicons.org/ford" },
  { id: "b-32", name: "Toyota",           slug: "toyota",           logo: "https://cdn.simpleicons.org/toyota" },
  { id: "b-33", name: "Honda",            slug: "honda",            logo: "https://cdn.simpleicons.org/honda" },
  { id: "b-34", name: "Suzuki",           slug: "suzuki",           logo: "https://cdn.simpleicons.org/suzuki" },
  { id: "b-35", name: "Google",           slug: "google",           logo: "https://cdn.simpleicons.org/google" },
  { id: "b-36", name: "Victoria's Secret",slug: "victorias-secret", logo: "https://cdn.simpleicons.org/victoriassecret" },
  { id: "b-37", name: "Urban Decay",      slug: "urban-decay",      logo: "https://cdn.simpleicons.org/urbandecay" },
  { id: "b-38", name: "Omega",            slug: "omega",            logo: "https://cdn.simpleicons.org/omega" },
  { id: "b-39", name: "Guess",            slug: "guess",            logo: "https://cdn.simpleicons.org/guess" },
  { id: "b-40", name: "Volvo",            slug: "volvo",            logo: "https://cdn.simpleicons.org/volvo" },
=======
// Logo URLs sourced from Clearbit Logo API (reliable CDN)

export const brands: Brand[] = [
  { id: "b-1",  name: "ACER",             slug: "acer",             logo: "https://logo.clearbit.com/acer.com" },
  { id: "b-2",  name: "Adidas",           slug: "adidas",           logo: "https://logo.clearbit.com/adidas.com" },
  { id: "b-3",  name: "Apple",            slug: "apple",            logo: "https://logo.clearbit.com/apple.com" },
  { id: "b-4",  name: "ASUS",             slug: "asus",             logo: "https://logo.clearbit.com/asus.com" },
  { id: "b-5",  name: "Samsung",          slug: "samsung",          logo: "https://logo.clearbit.com/samsung.com" },
  { id: "b-6",  name: "Sony",             slug: "sony",             logo: "https://logo.clearbit.com/sony.com" },
  { id: "b-7",  name: "Dell",             slug: "dell",             logo: "https://logo.clearbit.com/dell.com" },
  { id: "b-8",  name: "Lenovo",           slug: "lenovo",           logo: "https://logo.clearbit.com/lenovo.com" },
  { id: "b-9",  name: "HP",               slug: "hp",               logo: "https://logo.clearbit.com/hp.com" },
  { id: "b-10", name: "Nike",             slug: "nike",             logo: "https://logo.clearbit.com/nike.com" },
  { id: "b-11", name: "Puma",             slug: "puma",             logo: "https://logo.clearbit.com/puma.com" },
  { id: "b-12", name: "Reebok",           slug: "reebok",           logo: "https://logo.clearbit.com/reebok.com" },
  { id: "b-13", name: "Gucci",            slug: "gucci",            logo: "https://logo.clearbit.com/gucci.com" },
  { id: "b-14", name: "Ralph Lauren",     slug: "ralph-lauren",     logo: "https://logo.clearbit.com/ralphlauren.com" },
  { id: "b-15", name: "Calvin Klein",     slug: "calvin-klein",     logo: "https://logo.clearbit.com/calvinklein.com" },
  { id: "b-16", name: "Yamaha",           slug: "yamaha",           logo: "https://logo.clearbit.com/yamaha.com" },
  { id: "b-17", name: "Rolex",            slug: "rolex",            logo: "https://logo.clearbit.com/rolex.com" },
  { id: "b-18", name: "Canon",            slug: "canon",            logo: "https://logo.clearbit.com/canon.com" },
  { id: "b-19", name: "Corsair",          slug: "corsair",          logo: "https://logo.clearbit.com/corsair.com" },
  { id: "b-20", name: "Logitech",         slug: "logitech",         logo: "https://logo.clearbit.com/logitech.com" },
  { id: "b-21", name: "Microsoft",        slug: "microsoft",        logo: "https://logo.clearbit.com/microsoft.com" },
  { id: "b-22", name: "LG",               slug: "lg",               logo: "https://logo.clearbit.com/lg.com" },
  { id: "b-23", name: "Nokia",            slug: "nokia",            logo: "https://logo.clearbit.com/nokia.com" },
  { id: "b-24", name: "Xiaomi",           slug: "xiaomi",           logo: "https://logo.clearbit.com/xiaomi.com" },
  { id: "b-25", name: "OnePlus",          slug: "one-plus",         logo: "https://logo.clearbit.com/oneplus.com" },
  { id: "b-26", name: "Mercedes-Benz",    slug: "mercedes-benz",    logo: "https://logo.clearbit.com/mercedes-benz.com" },
  { id: "b-27", name: "BMW",              slug: "bmw",              logo: "https://logo.clearbit.com/bmw.com" },
  { id: "b-28", name: "Audi",             slug: "audi",             logo: "https://logo.clearbit.com/audi.com" },
  { id: "b-29", name: "Lamborghini",      slug: "lamborghini",      logo: "https://logo.clearbit.com/lamborghini.com" },
  { id: "b-30", name: "Rolls-Royce",      slug: "rolls-royce",      logo: "https://logo.clearbit.com/rolls-roycemotorcars.com" },
  { id: "b-31", name: "Ford",             slug: "ford",             logo: "https://logo.clearbit.com/ford.com" },
  { id: "b-32", name: "Toyota",           slug: "toyota",           logo: "https://logo.clearbit.com/toyota.com" },
  { id: "b-33", name: "Honda",            slug: "honda",            logo: "https://logo.clearbit.com/honda.com" },
  { id: "b-34", name: "Suzuki",           slug: "suzuki",           logo: "https://logo.clearbit.com/suzuki.com" },
  { id: "b-35", name: "Google",           slug: "google",           logo: "https://logo.clearbit.com/google.com" },
  { id: "b-36", name: "Victoria's Secret",slug: "victorias-secret", logo: "https://logo.clearbit.com/victoriassecret.com" },
  { id: "b-37", name: "Urban Decay",      slug: "urban-decay",      logo: "https://logo.clearbit.com/urbandecay.com" },
  { id: "b-38", name: "Omega",            slug: "omega",            logo: "https://logo.clearbit.com/omegawatches.com" },
  { id: "b-39", name: "Guess",            slug: "guess",            logo: "https://logo.clearbit.com/guess.com" },
  { id: "b-40", name: "Volvo",            slug: "volvo",            logo: "https://logo.clearbit.com/volvo.com" },
>>>>>>> 85084d035d77697eb8ace6a69e5e1d6d4962ebb0
];

// ─── Products ─────────────────────────────────────────────────

export const products: Product[] = [
  // ── Women Clothing & Fashion ─────────────────────────────
  {
    id: "p-1",
    title: "NWT Adidas Yara Shahidi Green Jumpsuit - Women's LG - LIMITED EDITION",
    slug: "nwt-adidas-yara-shahidi-green-jumpsuit",
    price: 254.99,
    originalPrice: 320.0,
    image: "/images/placeholders/product-1.svg",
    images: [
      "/images/placeholders/product-1.svg",
      "/images/placeholders/product-2.svg",
      "/images/placeholders/product-3.svg",
    ],
    clubPoint: 0,
    category: "women-clothing-fashion",
    categoryName: "Women Clothing & Fashion",
    brand: "Adidas",
    description: `<div><h3>NWT Adidas Yara Shahidi Green Jumpsuit</h3><p>Brand new with tags. Women's size Large. A limited edition collaboration piece from the Adidas x Yara Shahidi collection. Features a relaxed fit, adjustable waist, and signature trefoil branding.</p><ul><li>Material: 100% Recycled Polyester</li><li>Color: Forest Green</li><li>Fit: Relaxed</li><li>Closure: Front zip</li></ul><p><strong>Condition:</strong> New with Tags (NWT)</p></div>`,
    sku: "ADI-YS-GRN-LG",
    tags: ["adidas", "jumpsuit", "women", "limited edition", "green"],
    colors: [
      { name: "Forest Green", hex: "#2e7d32" },
      { name: "Black", hex: "#212121" },
    ],
    sizes: ["S", "M", "L", "XL"],
    inStock: true,
    stockCount: 15,
    seller: sellers.jwsCollections,
    rating: 4.5,
    reviewCount: 8,
  },
  {
    id: "p-2",
    title: "The NORTH FACE Women's Gotham Insulated Parka Coat White Dune",
    slug: "north-face-womens-gotham-parka-white-dune",
    price: 289.99,
    originalPrice: 350.0,
    image: "/images/placeholders/product-2.svg",
    images: [
      "/images/placeholders/product-4.svg",
      "/images/placeholders/product-5.svg",
      "/images/placeholders/product-6.svg",
    ],
    clubPoint: 0,
    category: "women-clothing-fashion",
    categoryName: "Women Clothing & Fashion",
    brand: "North Face",
    description: `<div><h3>The North Face Gotham Insulated Parka</h3><p>Premium insulated parka designed for harsh winter conditions. 550-fill goose down insulation keeps you warm in sub-zero temperatures. Faux-fur trimmed hood is removable.</p><ul><li>Insulation: 550-fill goose down</li><li>Shell: DryVent™ waterproof</li><li>Hood: Removable faux-fur trim</li><li>Length: Mid-thigh</li></ul></div>`,
    sku: "TNF-GTH-WHT-W",
    tags: ["north face", "parka", "winter", "coat", "women"],
    colors: [
      { name: "White Dune", hex: "#f5f0e8" },
      { name: "TNF Black", hex: "#1a1a1a" },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    stockCount: 22,
    seller: sellers.inhouse,
    rating: 4.8,
    reviewCount: 23,
  },
  {
    id: "p-3",
    title: "McQ Women's Sleeveless Contour Dress Darkest Black LG",
    slug: "mcq-womens-sleeveless-contour-dress-black",
    price: 312.49,
    originalPrice: 450.0,
    image: "/images/placeholders/product-3.svg",
    images: [
      "/images/placeholders/product-7.svg",
      "/images/placeholders/product-8.svg",
    ],
    clubPoint: 0,
    category: "women-clothing-fashion",
    categoryName: "Women Clothing & Fashion",
    brand: "McQ",
    description: `<div><p>McQ Alexander McQueen sleeveless contour dress in darkest black. Features a flattering bodycon silhouette with subtle contour seaming. Perfect for evening events or cocktail parties.</p></div>`,
    sku: "MCQ-DRS-BLK-LG",
    tags: ["mcq", "dress", "black", "women", "designer"],
    colors: [{ name: "Darkest Black", hex: "#0a0a0a" }],
    sizes: ["S", "M", "L"],
    inStock: true,
    stockCount: 8,
    seller: sellers.luxuryFinds,
    rating: 4.2,
    reviewCount: 5,
  },

  // ── Women's Fashion Bag ──────────────────────────────────
  {
    id: "p-4",
    title: "Versace Women's Black Leather Tote Shoulder Handbag Bag",
    slug: "versace-womens-black-leather-tote",
    price: 1562.5,
    originalPrice: 2100.0,
    image: "/images/placeholders/product-4.svg",
    images: [
      "/images/placeholders/product-9.svg",
      "/images/placeholders/product-10.svg",
      "/images/placeholders/product-11.svg",
    ],
    clubPoint: 0,
    category: "womens-fashion-bag",
    categoryName: "Women's Fashion Bag",
    brand: "Versace",
    description: `<div><h3>Versace Black Leather Tote</h3><p>Authentic Versace women's black leather tote shoulder handbag. Crafted from premium Italian leather with iconic Medusa medallion hardware.</p><ul><li>Material: Genuine Leather</li><li>Lining: Fabric</li><li>Closure: Magnetic snap</li><li>Dimensions: 13" W x 11" H x 5" D</li></ul></div>`,
    sku: "VRS-TOTE-BLK",
    tags: ["versace", "tote", "leather", "designer", "handbag"],
    colors: [{ name: "Black", hex: "#000000" }],
    sizes: [],
    inStock: true,
    stockCount: 3,
    seller: sellers.luxuryFinds,
    rating: 5.0,
    reviewCount: 2,
  },
  {
    id: "p-5",
    title: "Alexander McQueen Handbag Brand New",
    slug: "alexander-mcqueen-handbag-brand-new",
    price: 2250.0,
    originalPrice: null,
    image: "/images/placeholders/product-5.svg",
    images: [
      "/images/placeholders/product-12.svg",
      "/images/placeholders/product-13.svg",
    ],
    clubPoint: 0,
    category: "womens-fashion-bag",
    categoryName: "Women's Fashion Bag",
    brand: "Alexander McQueen",
    description: `<div><p>Brand new Alexander McQueen handbag. Comes with dust bag and authenticity card. Signature skull clasp closure in gold-tone hardware.</p></div>`,
    sku: "AMQ-HB-NEW",
    tags: ["alexander mcqueen", "handbag", "designer", "luxury"],
    colors: [
      { name: "Ivory", hex: "#fffff0" },
      { name: "Black", hex: "#000000" },
    ],
    sizes: [],
    inStock: true,
    stockCount: 2,
    seller: sellers.luxuryFinds,
    rating: 4.9,
    reviewCount: 1,
  },
  {
    id: "p-6",
    title: "Gucci Drawstring Bag, New w/ Tags & Dustbag, Authentic",
    slug: "gucci-drawstring-bag-new-tags-dustbag",
    price: 973.75,
    originalPrice: 1250.0,
    image: "/images/placeholders/product-6.svg",
    images: [
      "/images/placeholders/product-14.svg",
      "/images/placeholders/product-15.svg",
      "/images/placeholders/product-16.svg",
    ],
    clubPoint: 0,
    category: "womens-fashion-bag",
    categoryName: "Women's Fashion Bag",
    brand: "Gucci",
    description: `<div><p>Authentic Gucci drawstring bag in GG Supreme canvas. Brand new with original tags and dust bag included. Features adjustable leather drawstring closure and gold-tone GG hardware.</p></div>`,
    sku: "GUC-DRW-SUP",
    tags: ["gucci", "drawstring", "authentic", "designer"],
    colors: [{ name: "GG Supreme", hex: "#c4a77d" }],
    sizes: [],
    inStock: true,
    stockCount: 1,
    seller: sellers.luxuryFinds,
    rating: 4.7,
    reviewCount: 3,
  },

  // ── Computer & Accessories ───────────────────────────────
  {
    id: "p-7",
    title: "Dell Latitude 7455 14\" Laptop Copilot+ Snapdragon X Plus 512GB SSD 16GB RAM",
    slug: "dell-latitude-7455-14-laptop-copilot-snapdragon",
    price: 849.99,
    originalPrice: 1099.0,
    image: "/images/placeholders/product-7.svg",
    images: [
      "/images/placeholders/product-17.svg",
      "/images/placeholders/product-18.svg",
      "/images/placeholders/product-19.svg",
    ],
    clubPoint: 0,
    category: "computer-accessories",
    categoryName: "Computer & Accessories",
    brand: "Dell",
    description: `<div><h3>Dell Latitude 7455</h3><p>14-inch QHD display laptop powered by Snapdragon X Plus processor with Copilot+ AI capabilities. Features 16GB RAM and 512GB SSD for fast, responsive performance.</p><ul><li>Display: 14" QHD (2560x1440)</li><li>Processor: Snapdragon X Plus</li><li>RAM: 16GB LPDDR5</li><li>Storage: 512GB NVMe SSD</li><li>OS: Windows 11 Pro</li></ul></div>`,
    sku: "DELL-7455-SNP",
    tags: ["dell", "laptop", "snapdragon", "copilot", "business"],
    colors: [{ name: "Silver", hex: "#c0c0c0" }],
    sizes: [],
    inStock: true,
    stockCount: 45,
    seller: sellers.techVault,
    rating: 4.4,
    reviewCount: 18,
  },
  {
    id: "p-8",
    title: "2023 Dell Latitude 3340 i7",
    slug: "2023-dell-latitude-3340-i7",
    price: 360.0,
    originalPrice: 520.0,
    image: "/images/placeholders/product-8.svg",
    images: [
      "/images/placeholders/product-20.svg",
      "/images/placeholders/product-1.svg",
    ],
    clubPoint: 0,
    category: "computer-accessories",
    categoryName: "Computer & Accessories",
    brand: "Dell",
    description: `<div><p>2023 Dell Latitude 3340 with Intel Core i7 processor. Ideal for business and productivity. Lightweight, portable design with excellent battery life.</p></div>`,
    sku: "DELL-3340-I7",
    tags: ["dell", "laptop", "i7", "business"],
    colors: [{ name: "Black", hex: "#1a1a1a" }],
    sizes: [],
    inStock: true,
    stockCount: 30,
    seller: sellers.techVault,
    rating: 4.1,
    reviewCount: 12,
  },

  // ── Men Clothing & Fashion ───────────────────────────────
  {
    id: "p-9",
    title: "PUMA X Helly Hansen Tech Jacket 59827794 Trellis HH NEW 2020",
    slug: "puma-x-helly-hansen-tech-jacket",
    price: 254.99,
    originalPrice: 320.0,
    image: "/images/placeholders/product-9.svg",
    images: [
      "/images/placeholders/product-2.svg",
      "/images/placeholders/product-3.svg",
      "/images/placeholders/product-4.svg",
    ],
    clubPoint: 0,
    category: "men-clothing-fashion",
    categoryName: "Men Clothing & Fashion",
    brand: "Puma",
    description: `<div><h3>PUMA x Helly Hansen Tech Jacket</h3><p>Limited edition collaboration between PUMA and Helly Hansen. Features waterproof fabric, taped seams, and reflective branding. Color: Trellis. New with tags.</p></div>`,
    sku: "PMA-HH-TRLS",
    tags: ["puma", "helly hansen", "jacket", "tech", "men"],
    colors: [
      { name: "Trellis", hex: "#7fa99b" },
      { name: "Black", hex: "#1a1a1a" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    inStock: true,
    stockCount: 18,
    seller: sellers.jwsCollections,
    rating: 4.6,
    reviewCount: 7,
  },
  {
    id: "p-10",
    title: "Supreme Fox Racing Hooded Work Jacket",
    slug: "supreme-fox-racing-hooded-work-jacket",
    price: 1062.5,
    originalPrice: null,
    image: "/images/placeholders/product-10.svg",
    images: [
      "/images/placeholders/product-5.svg",
      "/images/placeholders/product-6.svg",
    ],
    clubPoint: 0,
    category: "men-clothing-fashion",
    categoryName: "Men Clothing & Fashion",
    brand: "Supreme",
    description: `<div><p>Supreme x Fox Racing hooded work jacket. A highly sought-after collaboration piece. Features durable canvas construction, faux-sherpa lining, and embroidered Fox Racing logos.</p></div>`,
    sku: "SUP-FOX-HWJ",
    tags: ["supreme", "fox racing", "jacket", "streetwear", "hooded"],
    colors: [{ name: "Orange", hex: "#e65100" }],
    sizes: ["M", "L", "XL"],
    inStock: true,
    stockCount: 4,
    seller: sellers.jwsCollections,
    rating: 4.3,
    reviewCount: 2,
  },
  {
    id: "p-11",
    title: "Denim Tears Mono Cotton Wreath Washed Blue Sweatshorts LG",
    slug: "denim-tears-mono-cotton-wreath-sweatshorts",
    price: 312.49,
    originalPrice: 380.0,
    image: "/images/placeholders/product-11.svg",
    images: [
      "/images/placeholders/product-7.svg",
      "/images/placeholders/product-8.svg",
    ],
    clubPoint: 0,
    category: "men-clothing-fashion",
    categoryName: "Men Clothing & Fashion",
    brand: "Denim Tears",
    description: `<div><p>Denim Tears Mono Cotton Wreath sweatshorts in washed blue. Size Large. Features the iconic cotton wreath print, elastic waistband with drawcord, and side pockets.</p></div>`,
    sku: "DT-MC-WRTH-LG",
    tags: ["denim tears", "shorts", "streetwear", "cotton wreath"],
    colors: [{ name: "Washed Blue", hex: "#5c8db8" }],
    sizes: ["S", "M", "L", "XL"],
    inStock: true,
    stockCount: 10,
    seller: sellers.jwsCollections,
    rating: 4.0,
    reviewCount: 4,
  },

  // ── Beauty, Health & Hair ────────────────────────────────
  {
    id: "p-12",
    title: "Victoria's Secret DREAM ANGELS HEAVENLY Perfume EDP 1oz 30ml New",
    slug: "victorias-secret-dream-angels-heavenly-perfume",
    price: 42.99,
    originalPrice: 55.0,
    image: "/images/placeholders/product-12.svg",
    images: [
      "/images/placeholders/product-9.svg",
      "/images/placeholders/product-10.svg",
    ],
    clubPoint: 0,
    category: "beauty-health-hair",
    categoryName: "Beauty, Health & Hair",
    brand: "Victoria's Secret",
    description: `<div><p>Victoria's Secret Dream Angels Heavenly Eau de Parfum Spray. 1oz/30ml. Brand new, sealed. A timeless fragrance with notes of white peony, sandalwood musk, and vanilla orchid.</p></div>`,
    sku: "VS-DAH-1OZ",
    tags: ["victoria's secret", "perfume", "heavenly", "fragrance"],
    colors: [],
    sizes: ["1 oz", "1.7 oz", "3.4 oz"],
    inStock: true,
    stockCount: 50,
    seller: sellers.inhouse,
    rating: 4.7,
    reviewCount: 35,
  },

  // ── Jewelry & Watches ────────────────────────────────────
  {
    id: "p-13",
    title: "Movado Men's Bold Verso White Ceramic Case and Link Bracelet",
    slug: "movado-mens-bold-verso-white-ceramic",
    price: 995.0,
    originalPrice: null,
    image: "/images/placeholders/product-13.svg",
    images: [
      "/images/placeholders/product-11.svg",
      "/images/placeholders/product-12.svg",
      "/images/placeholders/product-13.svg",
    ],
    clubPoint: 0,
    category: "jewelry-watches",
    categoryName: "Jewelry & Watches",
    brand: "Movado",
    description: `<div><h3>Movado Bold Verso</h3><p>Men's Bold Verso watch with white ceramic case and link bracelet. Model 3600900. Swiss quartz movement, 42mm case diameter, sapphire crystal. Water resistant to 30 meters.</p></div>`,
    sku: "MOV-BV-3600900",
    tags: ["movado", "watch", "ceramic", "bold verso", "swiss"],
    colors: [{ name: "White", hex: "#ffffff" }],
    sizes: [],
    inStock: true,
    stockCount: 5,
    seller: sellers.luxuryFinds,
    rating: 4.6,
    reviewCount: 9,
  },
  {
    id: "p-14",
    title: "New William Henry Monomyth Beaded Bracelet BB65 FBOM - LG",
    slug: "william-henry-monomyth-beaded-bracelet",
    price: 1187.5,
    originalPrice: 1500.0,
    image: "/images/placeholders/product-14.svg",
    images: [
      "/images/placeholders/product-14.svg",
      "/images/placeholders/product-15.svg",
    ],
    clubPoint: 0,
    category: "jewelry-watches",
    categoryName: "Jewelry & Watches",
    brand: "William Henry",
    description: `<div><p>William Henry Monomyth beaded bracelet BB65 FBOM. Size Large. Handcrafted with sterling silver, fossil woolly mammoth tooth, and brecciated jasper beads. A true collector's piece.</p></div>`,
    sku: "WH-BB65-LG",
    tags: ["william henry", "bracelet", "beaded", "sterling silver"],
    colors: [],
    sizes: ["M", "LG"],
    inStock: true,
    stockCount: 2,
    seller: sellers.luxuryFinds,
    rating: 5.0,
    reviewCount: 1,
  },

  // ── Sports & Outdoor ─────────────────────────────────────
  {
    id: "p-15",
    title: "Hoka One One Speedgoat 5 White Cloud Hiking Running Shoes",
    slug: "hoka-speedgoat-5-white-cloud",
    price: 154.99,
    originalPrice: 185.0,
    image: "/images/placeholders/product-15.svg",
    images: [
      "/images/placeholders/product-16.svg",
      "/images/placeholders/product-17.svg",
      "/images/placeholders/product-18.svg",
    ],
    clubPoint: 0,
    category: "sports-outdoor",
    categoryName: "Sports & Outdoor",
    brand: "Hoka",
    description: `<div><h3>Hoka One One Speedgoat 5</h3><p>Trail running shoes in White Cloud colorway. Vibram Megagrip outsole for superior traction. Responsive CMEVA midsole provides cushioned comfort on rugged terrain.</p></div>`,
    sku: "HOKA-SG5-WNCL",
    tags: ["hoka", "running", "trail", "hiking", "speedgoat"],
    colors: [
      { name: "White Cloud", hex: "#f5f5f0" },
      { name: "Black", hex: "#1a1a1a" },
    ],
    sizes: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11"],
    inStock: true,
    stockCount: 25,
    seller: sellers.inhouse,
    rating: 4.8,
    reviewCount: 42,
  },
  {
    id: "p-16",
    title: "Puma Fenty by Rihanna Pointy Creeper Patent Black Women's Size 7",
    slug: "puma-fenty-rihanna-pointy-creeper-patent-black",
    price: 189.99,
    originalPrice: 250.0,
    image: "/images/placeholders/product-16.svg",
    images: [
      "/images/placeholders/product-19.svg",
      "/images/placeholders/product-20.svg",
    ],
    clubPoint: 0,
    category: "sports-outdoor",
    categoryName: "Sports & Outdoor",
    brand: "Puma",
    description: `<div><p>Puma Fenty by Rihanna Pointy Creeper Patent in Black. Style 366270-01. Women's Size 7. Patent leather upper with a creeper-style platform sole. A fashion-forward sneaker.</p></div>`,
    sku: "PMA-FNT-366270",
    tags: ["puma", "fenty", "rihanna", "creeper", "patent"],
    colors: [{ name: "Black Patent", hex: "#0a0a0a" }],
    sizes: ["6", "6.5", "7", "7.5", "8"],
    inStock: true,
    stockCount: 6,
    seller: sellers.jwsCollections,
    rating: 4.4,
    reviewCount: 11,
  },

  // ── Kids & Toy ───────────────────────────────────────────
  {
    id: "p-17",
    title: "Fendi Kids Unisex Monogram Strap Designer Casual Walking Fashion Sneakers",
    slug: "fendi-kids-monogram-strap-sneakers",
    price: 240.0,
    originalPrice: 320.0,
    image: "/images/placeholders/product-17.svg",
    images: [
      "/images/placeholders/product-1.svg",
      "/images/placeholders/product-2.svg",
    ],
    clubPoint: 0,
    category: "kids-toy",
    categoryName: "Kids & Toy",
    brand: "Fendi",
    description: `<div><p>Fendi Kids unisex monogram strap sneakers. Brand new in box. Features the iconic FF monogram print, hook-and-loop strap closure, and comfortable rubber sole. Perfect for little fashionistas.</p></div>`,
    sku: "FND-KDS-SNK",
    tags: ["fendi", "kids", "sneakers", "designer", "monogram"],
    colors: [{ name: "Brown Monogram", hex: "#8b6914" }],
    sizes: ["28", "29", "30", "31", "32", "33"],
    inStock: true,
    stockCount: 12,
    seller: sellers.luxuryFinds,
    rating: 4.5,
    reviewCount: 6,
  },
  {
    id: "p-18",
    title: "3 Pc Nike Baby Girls Outfit 0-6 Months Bodysuit Booties Headband Black Pink",
    slug: "nike-baby-girls-outfit-3pc-black-pink",
    price: 29.99,
    originalPrice: 40.0,
    image: "/images/placeholders/product-18.svg",
    images: [
      "/images/placeholders/product-3.svg",
      "/images/placeholders/product-4.svg",
    ],
    clubPoint: 0,
    category: "kids-toy",
    categoryName: "Kids & Toy",
    brand: "Nike",
    description: `<div><p>Nike Baby Girls 3-piece outfit set for ages 0-6 months. Includes bodysuit, booties, and headband in Black/Pink colorway. 100% cotton. Machine washable.</p></div>`,
    sku: "NK-BB-3PC-06M",
    tags: ["nike", "baby", "girls", "outfit", "infant"],
    colors: [{ name: "Black/Pink", hex: "#e91e63" }],
    sizes: ["0-6M"],
    inStock: true,
    stockCount: 35,
    seller: sellers.inhouse,
    rating: 4.9,
    reviewCount: 28,
  },

  // ── LOUIS VUITTON (Bag) ──────────────────────────────────
  {
    id: "p-19",
    title: "LOUIS VUITTON NICE BB MONOGRAM NEW IN BOX",
    slug: "louis-vuitton-nice-bb-monogram-new-in-box",
    price: 1937.5,
    originalPrice: null,
    image: "/images/placeholders/product-19.svg",
    images: [
      "/images/placeholders/product-5.svg",
      "/images/placeholders/product-6.svg",
      "/images/placeholders/product-7.svg",
    ],
    clubPoint: 0,
    category: "womens-fashion-bag",
    categoryName: "Women's Fashion Bag",
    brand: "Louis Vuitton",
    description: `<div><p>Louis Vuitton Nice BB in iconic Monogram canvas. Brand new in original box with dust bag, receipt, and all tags. The Nice BB is perfect as a mini trunk or vanity case.</p></div>`,
    sku: "LV-NICE-BB-MON",
    tags: ["louis vuitton", "nice bb", "monogram", "trunk", "luxury"],
    colors: [{ name: "Monogram", hex: "#c4a77d" }],
    sizes: [],
    inStock: true,
    stockCount: 1,
    seller: sellers.luxuryFinds,
    rating: 5.0,
    reviewCount: 0,
  },

  // ── ANYA HINDMARCH (deal item) ───────────────────────────
  {
    id: "p-20",
    title: "ANYA HINDMARCH Handbag Leather BEG 2way",
    slug: "anya-hindmarch-handbag-leather-beg-2way",
    price: 514.0,
    originalPrice: 680.0,
    image: "/images/placeholders/product-20.svg",
    images: [
      "/images/placeholders/product-8.svg",
      "/images/placeholders/product-9.svg",
    ],
    clubPoint: 0,
    category: "womens-fashion-bag",
    categoryName: "Women's Fashion Bag",
    brand: "Anya Hindmarch",
    description: `<div><h3>ANYA HINDMARCH Handbag Leather BEG 2way</h3><p>Used condition. Dimensions: Depth 10cm, Height 27cm, Width 38cm, Handle 32.5cm. Can be used as a handbag or shoulder bag with detachable strap.</p><p><strong>Condition:</strong> USED</p></div>`,
    sku: "AH-HB-BEG-2W",
    tags: ["anya hindmarch", "handbag", "leather", "2way"],
    colors: [{ name: "Beige", hex: "#d2b48c" }],
    sizes: [],
    inStock: true,
    stockCount: 1,
    seller: sellers.inhouse,
    rating: 4.0,
    reviewCount: 0,
  },
];

// ─── Banner Slides ────────────────────────────────────────────

export const bannerSlides: BannerSlide[] = [
  {
    // Fashion — vibrant runway hero
    id: "slide-1",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=85",
    title: "New Season Fashion",
    subtitle: "Discover the latest trends in women's & men's clothing from top brands.",
    link: "/search?q=fashion",
    buttonText: "Shop Fashion",
  },
  {
    // Electronics / laptops — dark tech aesthetic
    id: "slide-2",
    image: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=1600&q=85",
    title: "Tech Deals — Up to 40% Off",
    subtitle: "Latest laptops, phones & accessories from Dell, Apple, ASUS and more.",
    link: "/search?q=electronics",
    buttonText: "Shop Tech",
  },
  {
    // Cars / automobiles — dramatic wide shot
    id: "slide-3",
    image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1600&q=85",
    title: "Automobile & Accessories",
    subtitle: "From performance parts to must-have accessories — gear up today.",
    link: "/search?q=automobile",
    buttonText: "Explore Cars",
  },
  {
    // Luxury fashion — editorial look
    id: "slide-4",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=85",
    title: "Luxury Brands, Authenticated",
    subtitle: "Shop Gucci, Versace, Louis Vuitton & more with total confidence.",
    link: "/brands",
    buttonText: "Shop Luxury",
  },
  {
    // Sports & outdoor — energy + motion
    id: "slide-5",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=85",
    title: "Sports & Outdoor Gear",
    subtitle: "Premium sportswear and equipment from Adidas, Nike, Puma & more.",
    link: "/search?q=sports",
    buttonText: "Get Active",
  },
];

// ─── Flash Deals ──────────────────────────────────────────────

export const flashDeals: FlashDeal[] = [
  {
    product: products.find((p) => p.id === "p-20")!, // ANYA HINDMARCH
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 25,
  },
  {
    product: products.find((p) => p.id === "p-13")!, // Movado Watch
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 20,
  },
  {
    product: products.find((p) => p.id === "p-8")!, // Dell 3340
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 31,
  },
  {
    product: products.find((p) => p.id === "p-18")!, // Nike Baby
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 25,
  },
  {
    product: products.find((p) => p.id === "p-15")!, // Hoka Speedgoat
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 16,
  },
  {
    product: products.find((p) => p.id === "p-10")!, // Victoria's Secret Perfume
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 30,
  },
  {
    product: products.find((p) => p.id === "p-5")!, // Adidas Yara Shahidi
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 22,
  },
  {
    product: products.find((p) => p.id === "p-2")!, // The North Face Jacket
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 28,
  },
  {
    product: products.find((p) => p.id === "p-17")!, // Puma Tech Jacket
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 35,
  },
  {
    product: products.find((p) => p.id === "p-12")!, // Aigner Crossbody
    dealEndTime: "2026-02-15T23:59:59Z",
    discountPercent: 18,
  },
];

// ─── Blog Posts ───────────────────────────────────────────────

export const blogPosts: BlogPost[] = [
  {
    id: "blog-1",
    title: "3 Must-Buy Travel Items for Your Next Adventure",
    slug: "3-must-buy-travel-items",
    excerpt:
      "Planning your next trip? These three essentials will make your journey smoother, more comfortable, and worry-free.",
    content: `<article><p>Traveling is one of life's greatest pleasures, but being unprepared can turn a dream vacation into a stressful ordeal. After years of traveling, here are the three items I never leave home without:</p><h2>1. A Quality Packing Cube Set</h2><p>Organization is key. Packing cubes help you maximize luggage space and keep everything orderly. Look for lightweight, durable options with mesh panels for breathability.</p><h2>2. Noise-Canceling Headphones</h2><p>Whether you're on a long flight or in a noisy hotel, noise-canceling headphones are a game-changer. They help you sleep, focus, and enjoy entertainment without distractions.</p><h2>3. A Universal Power Adapter</h2><p>Nothing is worse than arriving at your destination and not being able to charge your devices. A universal adapter with USB-C and USB-A ports covers all your needs.</p></article>`,
    image: "https://placehold.co/800x450/e3f2fd/1565c0?text=Travel+Essentials",
    date: "2026-01-15",
    author: "Sarah Chen",
  },
  {
    id: "blog-2",
    title: "How to Style a Designer Handbag for Any Occasion",
    slug: "how-to-style-designer-handbag",
    excerpt:
      "From boardroom meetings to weekend brunches, learn how to make your designer bag work for every event in your calendar.",
    content: `<article><p>A designer handbag is more than an accessory — it's a statement. Here's how to maximize your investment by styling it for different occasions.</p><h2>Office Chic</h2><p>Pair a structured tote with tailored trousers and a blazer. Stick to neutral colors for versatility.</p><h2>Weekend Casual</h2><p>Cross-body bags work perfectly with jeans and a simple tee. Don't be afraid to mix luxury with casual.</p><h2>Evening Elegance</h2><p>A clutch or mini bag in a bold color elevates any evening look instantly.</p></article>`,
    image: "https://placehold.co/800x450/fce4ec/880e4f?text=Designer+Handbags",
    date: "2026-01-22",
    author: "Maria Santos",
  },
  {
    id: "blog-3",
    title: "Top 5 Tech Gadgets Every Remote Worker Needs in 2026",
    slug: "top-5-tech-gadgets-remote-worker-2026",
    excerpt:
      "Working from home? These five gadgets will boost your productivity and make your home office feel professional.",
    content: `<article><p>The remote work revolution is here to stay. Investing in the right tech can dramatically improve your work-from-home experience.</p><h2>1. Ultra-Wide Monitor</h2><p>A 34-inch ultra-wide gives you the screen real estate of two monitors without the bezel gap.</p><h2>2. Mechanical Keyboard</h2><p>Better typing experience, lower fatigue. Choose tactile switches for the best feedback.</p><h2>3. Webcam with Ring Light</h2><p>Look professional on video calls with a dedicated webcam that includes built-in lighting.</p><h2>4. Standing Desk Converter</h2><p>Alternate between sitting and standing to improve posture and energy levels.</p><h2>5. Wireless Earbuds with ANC</h2><p>For focus time and calls alike, quality earbuds are non-negotiable.</p></article>`,
    image: "https://placehold.co/800x450/e8f5e9/2e7d32?text=Tech+Gadgets+2026",
    date: "2026-02-01",
    author: "James Park",
  },
  {
    id: "blog-4",
    title: "The Rise of Sustainable Fashion: What You Need to Know",
    slug: "rise-of-sustainable-fashion",
    excerpt:
      "Sustainable fashion is more than a trend. Discover how eco-conscious choices are reshaping the industry and how you can participate.",
    content: `<article><p>The fashion industry is undergoing a transformation. Consumers are increasingly demanding transparency, ethical production, and sustainable materials.</p><h2>Why It Matters</h2><p>The fashion industry accounts for 10% of global carbon emissions. By choosing sustainable brands, you reduce your environmental footprint.</p><h2>What to Look For</h2><p>Certifications like GOTS, Fair Trade, and B Corp indicate genuine commitment. Also look for recycled materials and transparent supply chains.</p></article>`,
    image: "https://placehold.co/800x450/e0f2f1/004d40?text=Sustainable+Fashion",
    date: "2026-02-05",
    author: "Emily Nakamura",
  },
  {
    id: "blog-5",
    title: "Gift Guide: Luxury Items Under $500 for Every Taste",
    slug: "luxury-gift-guide-under-500",
    excerpt:
      "Looking for a special gift? Our curated list of luxury items under $500 has something for everyone on your list.",
    content: `<article><p>Finding the perfect luxury gift doesn't have to break the bank. Here are our top picks across categories:</p><h2>For Her</h2><p>Victoria's Secret Dream Angels Heavenly perfume set, designer scarves, and premium cosmetics kits.</p><h2>For Him</h2><p>A quality leather wallet, premium headphones, or a signature fragrance from a top brand.</p><h2>For Kids</h2><p>Designer sneakers, educational tech toys, or personalized accessories.</p></article>`,
    image: "https://placehold.co/800x450/fff3e0/e65100?text=Luxury+Gift+Guide",
    date: "2026-02-08",
    author: "Alex Rivera",
  },
];

// ─── Shops ────────────────────────────────────────────────────

export const shops: Shop[] = [
  {
    id: "shop-1",
    name: "JWS Collections",
    slug: "jws-collections",
    banner: "https://placehold.co/1200x300/3490dc/ffffff?text=JWS+Collections",
    logo: sellers.jwsCollections.logo,
    description:
      "Premium streetwear and designer fashion. We source authentic items from around the world and deliver them to your doorstep with care.",
    rating: 4.7,
    productCount: 85,
    memberSince: "2023-03-15",
  },
  {
    id: "shop-2",
    name: "Tech Vault",
    slug: "tech-vault",
    banner: "https://placehold.co/1200x300/1565c0/ffffff?text=Tech+Vault",
    logo: sellers.techVault.logo,
    description:
      "Your trusted source for laptops, monitors, and computer accessories. All items tested and verified before shipping.",
    rating: 4.3,
    productCount: 63,
    memberSince: "2022-11-01",
  },
  {
    id: "shop-3",
    name: "Luxury Finds",
    slug: "luxury-finds",
    banner: "https://placehold.co/1200x300/805ad5/ffffff?text=Luxury+Finds",
    logo: sellers.luxuryFinds.logo,
    description:
      "Authenticated luxury goods. Every item is verified for authenticity. Shop Gucci, Versace, Louis Vuitton, Fendi & more.",
    rating: 4.8,
    productCount: 42,
    memberSince: "2024-01-20",
  },
  {
    id: "shop-4",
    name: "Inhouse Product",
    slug: "inhouse-product",
    banner: "https://placehold.co/1200x300/38a169/ffffff?text=Inhouse+Product",
    logo: sellers.inhouse.logo,
    description:
      "Official Seller Store marketplace products. Wide range of categories with fast shipping and easy returns.",
    rating: 4.5,
    productCount: 150,
    memberSince: "2021-06-01",
  },
];

// ─── Helper: get products by category ─────────────────────────

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.category === categorySlug);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getShopBySlug(slug: string): Shop | undefined {
  return shops.find((s) => s.slug === slug);
}

export function getBlogBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((b) => b.slug === slug);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
  );
}
