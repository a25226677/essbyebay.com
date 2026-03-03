// ─────────────────────────────────────────────────────────────
// lib/types.ts — Central TypeScript interfaces for Seller Store
// ─────────────────────────────────────────────────────────────

// ─── Product ──────────────────────────────────────────────────

export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  originalPrice: number | null; // null = no discount
  image: string; // primary image URL
  images: string[]; // all gallery images
  clubPoint: number;
  category: string; // category slug
  categoryName: string; // display label
  brand: string;
  description: string; // HTML content string
  sku: string;
  tags: string[];
  colors: ProductColor[];
  sizes: string[];
  inStock: boolean;
  stockCount: number;
  seller: Seller;
  rating: number; // 0–5
  reviewCount: number;
}

export interface ProductColor {
  name: string;
  hex: string; // e.g. "#000000"
}

// ─── Category ─────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string; // Lucide icon component name
  image: string;
  productCount: number;
}

// ─── Brand ────────────────────────────────────────────────────

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
}

// ─── Banner / Hero ────────────────────────────────────────────

export interface BannerSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  link: string;
  buttonText: string;
}

// ─── Flash Deal ───────────────────────────────────────────────

export interface FlashDeal {
  product: Product;
  dealEndTime: string; // ISO 8601 date string
  discountPercent: number;
}

// ─── Blog ─────────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string; // HTML content string
  image: string;
  date: string; // ISO 8601 date string
  author: string;
}

// ─── Seller / Shop ────────────────────────────────────────────

export interface Seller {
  id: string;
  name: string;
  slug: string;
  logo: string;
  rating: number;
  productCount: number;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  banner: string;
  logo: string;
  description: string;
  rating: number;
  productCount: number;
  memberSince: string; // ISO 8601 date string
}

// ─── Cart ─────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string | null;
  selectedSize: string | null;
}

// ─── Review ───────────────────────────────────────────────────

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}
