# eSeller Store Bay — Complete Implementation Guide

> **Project:** Pixel-perfect clone of [esellerstorebay.com](https://esellerstorebay.com)
> **Stack:** Next.js 14+ (App Router) · Tailwind CSS · TypeScript · shadcn/ui · Lucide React · Supabase · Zustand
> **Last Updated:** February 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design System & Brand Tokens](#2-design-system--brand-tokens)
3. [Phase 0 — Cleanup & Configuration](#3-phase-0--cleanup--configuration)
4. [Phase 1 — Data Layer (Types, Mock Data, Stores)](#4-phase-1--data-layer)
5. [Phase 2 — Global Shell (Layout, Header, Footer)](#5-phase-2--global-shell)
6. [Phase 3 — Reusable Components](#6-phase-3--reusable-components)
7. [Phase 4 — Homepage](#7-phase-4--homepage)
8. [Phase 5 — Product Detail Page](#8-phase-5--product-detail-page)
9. [Phase 6 — Shop Pages](#9-phase-6--shop-pages)
10. [Phase 7 — Blog Pages](#10-phase-7--blog-pages)
11. [Phase 8 — Static & Utility Pages](#11-phase-8--static--utility-pages)
12. [Phase 9 — Auth Pages](#12-phase-9--auth-pages)
13. [Phase 10 — Cart & Search](#13-phase-10--cart--search)
14. [Phase 11 — Final Polish & QA](#14-phase-11--final-polish--qa)
15. [File Tree Reference](#15-file-tree-reference)
16. [Component API Reference](#16-component-api-reference)
17. [Responsive Breakpoint Rules](#17-responsive-breakpoint-rules)
18. [Performance Checklist](#18-performance-checklist)

---

## 1. Architecture Overview

### 1.1 What We're Building

esellerstorebay.com is a multi-vendor e-commerce marketplace ("Ess by Ebay"). The site features:

- **Header:** 3-tier (Top Bar → Sticky Main Header → Nav Bar)
- **Homepage:** Hero carousel with category sidebar, flash deals, category-featured product sections, brand marquee
- **Product Detail:** 2-column layout with image gallery, variant selectors, quantity controls, tabbed description/reviews
- **Shop Pages:** Sidebar filters + product grid + pagination
- **Blog:** Grid listing + single post
- **Cart:** Table-style cart with quantity management
- **Auth:** Login, Registration, Seller Login, Password Reset
- **Seller Dashboard:** Product, order, payment, support, withdrawal, and settings management
- **Legal:** Terms, Return Policy, Support Policy, Privacy Policy
- **Mobile:** Fixed bottom navigation bar (Home, Categories, Cart, Notifications, Account)

### 1.2 Routing Strategy

```
STATIC ROUTES (exact paths)
──────────────────────────────
/                       → Homepage
/brands                 → All Brands listing
/categories             → All Categories listing
/flash-deals            → Flash Deals grid
/cart                   → Shopping Cart
/search                 → Search Results (uses ?q= query param)
/affiliate              → Affiliate Program info
/track-your-order       → Order Tracking form
/blog                   → Blog listing
/account                → User Dashboard (protected)
/shop/create            → Become a Seller form

DYNAMIC ROUTES (slug-based)
──────────────────────────────
/product/[slug]         → Product Detail Page
/shop/[shopSlug]        → Shop Landing Page
/shop/[shopSlug]/top-selling    → Shop's Top Sellers
/shop/[shopSlug]/all-products   → Shop's All Products
/blog/[slug]            → Single Blog Post

ROUTE GROUPS (no URL impact)
──────────────────────────────
/(auth)/users/login          → Customer Login
/(auth)/users/registration   → Customer Registration
/(auth)/seller/login         → Seller Login
/(auth)/password/reset       → Password Reset

/seller/(dashboard)/dashboard      → Seller Dashboard Home
/seller/(dashboard)/products       → Seller Products
/seller/(dashboard)/orders         → Seller Orders
/seller/(dashboard)/payments       → Seller Payments
/seller/(dashboard)/withdraw       → Seller Withdraw Requests
/seller/(dashboard)/commission     → Seller Commission History
/seller/(dashboard)/conversations  → Seller Conversations
/seller/(dashboard)/support        → Seller Support Tickets
/seller/(dashboard)/storehouse     → Seller Inventory / Stock
/seller/(dashboard)/files          → Seller Uploads / Assets
/seller/(dashboard)/settings       → Seller Store Settings

/(legal)/terms               → Terms & Conditions
/(legal)/return-policy       → Return Policy
/(legal)/support-policy      → Support Policy
/(legal)/privacy-policy      → Privacy Policy
```

### 1.3 Rendering Strategy

| Page | Rendering | Why |
|------|-----------|-----|
| Homepage | **Server Component** | Static content, no user-specific data |
| Product Detail | **Server Component** + client islands | Main content is static; variant selectors & cart buttons are client |
| Shop Page | **Server Component** + client sidebar | Filters are client-side interactive |
| Cart | **Client Component** | Entirely driven by Zustand store |
| Auth Pages | **Client Components** | Form interactions + Supabase auth calls |
| Seller Dashboard | **Server + Client hybrid** | Secure data reads on server, table/form interactions on client |
| Blog, Brands, Legal | **Server Components** | Pure static content |

### 1.5 UX and Functionality Goals (Mandatory)

This version of the plan prioritizes **production-ready UX** and **fully functional flows** over placeholder-only views.

Every page must include:

- **Data state handling:** loading, empty, error, success
- **URL/state sync:** filters, pagination, sort, search, tabs should be shareable by URL where relevant
- **Action feedback:** optimistic UI where safe + toast notifications for success/failure
- **Form quality:** client validation + server validation + field-level error text
- **Mobile usability:** no clipped actions, sticky primary CTAs where needed, 44px minimum touch targets
- **Accessibility:** keyboard navigation, clear focus styles, ARIA labels for icon buttons, semantic headings
- **Analytics-ready events:** identify key interactions (search submit, add-to-cart, checkout click, seller actions)

### 1.4 Files Already In Place (Reuse)

From the existing Supabase starter, we KEEP:

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser-side Supabase client (`createBrowserClient`) |
| `lib/supabase/server.ts` | Server-side Supabase client with cookie session |
| `lib/supabase/proxy.ts` | Middleware session refresh logic |
| `proxy.ts` | Next.js middleware entry point |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `components/ui/button.tsx` | shadcn Button |
| `components/ui/card.tsx` | shadcn Card |
| `components/ui/input.tsx` | shadcn Input |
| `components/ui/label.tsx` | shadcn Label |
| `components/ui/checkbox.tsx` | shadcn Checkbox |
| `components/ui/badge.tsx` | shadcn Badge |
| `components/ui/dropdown-menu.tsx` | shadcn DropdownMenu |
| `components.json` | shadcn/ui config (new-york style, neutral, CSS vars, lucide) |
| `tailwind.config.ts` | Tailwind config with shadcn theme extensions |
| `tsconfig.json` | TypeScript strict mode, `@/*` path alias |

---

## 2. Design System & Brand Tokens

### 2.1 Color Palette

Extracted from esellerstorebay.com:

```
BRAND COLORS
─────────────────────────────────────────────
Primary Blue:      #3490dc  (buttons, links, active nav)
Primary Hover:     #2779bd  (button hover state)
Sale Red:          #e53e3e  (sale prices, flash deal badges)
Success Green:     #38a169  (in-stock, success states)
Warning Orange:    #ed8936  (deal countdowns)

NEUTRAL PALETTE
─────────────────────────────────────────────
White:             #ffffff  (main background)
Light Gray:        #f8f9fa  (top bar, section backgrounds)
Border Gray:       #e2e8f0  (card borders, separators)
Muted Text:        #718096  (secondary text, meta info)
Body Text:         #4a5568  (paragraph text)
Heading Text:      #1a202c  (titles, nav links)

SURFACE COLORS
─────────────────────────────────────────────
Card Background:   #ffffff
Card Shadow:       0 1px 3px rgba(0,0,0,0.08)
Card Hover Shadow: 0 4px 12px rgba(0,0,0,0.12)
Footer Background: #1a202c  (dark navy/charcoal)
Footer Text:       #cbd5e0
Top Bar Background:#f8f9fa
```

### 2.2 Typography

```
FONT FAMILY
─────────────────────────────────────────────
Primary:     Inter (Google Font) — clean, modern sans-serif
Fallback:    system-ui, -apple-system, sans-serif

FONT SCALE (Tailwind classes)
─────────────────────────────────────────────
Top Bar:         text-xs     (12px)
Nav Links:       text-sm     (14px)
Body Text:       text-sm     (14px)
Card Title:      text-sm     (14px) — font-medium, line-clamp-2
Card Price:      text-base   (16px) — font-bold, text-red-600
Section Header:  text-lg     (18px) — font-semibold
Page Title (H1): text-2xl    (24px) — font-bold
Product Title:   text-xl     (20px) → lg:text-2xl (24px)
Hero Headline:   text-3xl    (30px) → lg:text-4xl (36px)
```

### 2.3 Spacing & Layout

```
CONTAINER
─────────────────────────────────────────────
Max Width:    1280px (Tailwind: max-w-7xl)
Padding X:    px-4 (mobile) → px-6 (tablet) → px-8 (desktop)

SECTION SPACING
─────────────────────────────────────────────
Between Sections:  py-8 (mobile) → py-12 (desktop)
Card Gap:          gap-4 (16px)
Grid Gap:          gap-4 → gap-6

CARD DIMENSIONS
─────────────────────────────────────────────
Product Card Width: ~220px min (responsive grid auto-fills)
Product Image:      aspect-square (1:1 ratio)
Card Padding:       p-0 (image bleeds) + p-3 (content area)
Card Border Radius: rounded-lg (8px)

HEADER HEIGHTS
─────────────────────────────────────────────
Top Bar:        h-8  (32px)   — hidden on mobile
Main Header:    h-16 (64px)   — sticky
Nav Bar:        h-10 (40px)   — hidden on mobile
Mobile Bottom:  h-14 (56px)   — fixed, md:hidden
```

### 2.4 Shadows & Borders

```
Card Default:     shadow-sm border border-gray-100
Card Hover:       shadow-md (transition-shadow duration-200)
Header Shadow:    shadow-sm (subtle bottom shadow when sticky)
Input Focus:      ring-2 ring-blue-500 ring-offset-1
Button Radius:    rounded-md (6px)
Card Radius:      rounded-lg (8px)
```

### 2.5 Icon System

All icons come from `lucide-react`. Key icon mappings:

```tsx
import {
  Search,              // Search bar
  Bell,                // Notifications
  Heart,               // Wishlist
  ShoppingBag,         // Cart
  Menu,                // Mobile hamburger
  X,                   // Close/dismiss
  ChevronRight,        // Breadcrumb separator, "View all" arrows
  ChevronLeft,         // Carousel prev
  ChevronDown,         // Dropdowns
  Home,                // Mobile nav
  Grid3X3,             // Categories (mobile nav)
  User,                // Account (mobile nav)
  Minus,               // Quantity decrease
  Plus,                // Quantity increase
  Star,                // Reviews/ratings
  Share2,              // Share product
  Eye,                 // Quick view
  GitCompare,          // Compare
  Truck,               // Shipping info
  RotateCcw,           // Refund/return
  MapPin,              // Contact address
  Mail,                // Contact email
  Phone,               // Contact phone
  Globe,               // Language selector
  Tag,                 // Deals/tags
  Zap,                 // Flash deals
  Store,               // Seller/Shop
  ArrowRight,          // CTA arrows
  Filter,              // Mobile filter trigger
  SlidersHorizontal,   // Sort/filter
} from "lucide-react";
```

---

## 3. Phase 0 — Cleanup & Configuration

### Step 0.1: Install New Dependencies

```bash
# Navigate to project root
cd with-supabase-app

# Install runtime dependencies
npm install zustand embla-carousel-react

# Add shadcn/ui components (run each one)
npx shadcn@latest add sheet
npx shadcn@latest add tabs
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add select
npx shadcn@latest add slider
npx shadcn@latest add radio-group
npx shadcn@latest add breadcrumb
npx shadcn@latest add carousel
npx shadcn@latest add scroll-area
npx shadcn@latest add pagination
npx shadcn@latest add navigation-menu
```

### Step 0.2: Remove Dark Mode

**File: `app/globals.css`**

Delete the ENTIRE `.dark { }` block. It starts with `.dark {` and contains all the `--background`, `--foreground`, etc. variables for dark mode.

Update the `:root` variables to match our brand palette:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;           /* #ffffff */
    --foreground: 220 14% 10%;         /* #1a202c */
    --card: 0 0% 100%;
    --card-foreground: 220 14% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 220 14% 10%;
    --primary: 210 79% 54%;            /* #3490dc */
    --primary-foreground: 0 0% 100%;
    --secondary: 220 14% 96%;          /* #f8f9fa */
    --secondary-foreground: 220 14% 10%;
    --muted: 220 14% 96%;
    --muted-foreground: 215 16% 47%;   /* #718096 */
    --accent: 220 14% 96%;
    --accent-foreground: 220 14% 10%;
    --destructive: 0 72% 51%;          /* #e53e3e - sale red */
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 91%;             /* #e2e8f0 */
    --input: 214 32% 91%;
    --ring: 210 79% 54%;               /* matches primary */
    --radius: 0.5rem;
    --chart-1: 210 79% 54%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### Step 0.3: Update Font to Inter

**File: `app/layout.tsx`**

```tsx
import { Inter } from "next/font/google";
// Remove: import { Geist } from "next/font/google";
// Remove: import { ThemeProvider } from "next-themes";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
```

### Step 0.4: Update Next.js Config

**File: `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "esellerstorebay.com",
        pathname: "/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
};

export default nextConfig;
```

### Step 0.5: Update Middleware

**File: `proxy.ts`**

Update the middleware to allow public access to all storefront routes. Only protect account/checkout pages.

```ts
// In the middleware matcher or request check logic, ensure these paths are PUBLIC:
const publicPaths = [
  "/",
  "/product",
  "/shop",
  "/blog",
  "/brands",
  "/categories",
  "/flash-deals",
  "/cart",
  "/search",
  "/terms",
  "/return-policy",
  "/support-policy",
  "/privacy-policy",
  "/affiliate",
  "/track-your-order",
  "/users/login",
  "/users/registration",
  "/seller/login",
  "/password/reset",
];

// Protected paths (require auth):
const protectedPaths = ["/account", "/checkout"];
```

### Step 0.6: Delete Old Files

Remove these files/folders that belong to the old tutorial starter:

```bash
# Old components (delete)
rm components/hero.tsx
rm components/deploy-button.tsx
rm components/env-var-warning.tsx
rm components/next-logo.tsx
rm components/supabase-logo.tsx
rm components/theme-switcher.tsx
rm -rf components/tutorial/

# Old auth form components (will be replaced)
rm components/login-form.tsx
rm components/sign-up-form.tsx
rm components/forgot-password-form.tsx
rm components/update-password-form.tsx
rm components/auth-button.tsx
rm components/logout-button.tsx

# Old auth pages (will be replaced with new route structure)
rm -rf app/auth/

# Old protected page (replaced by /account)
rm -rf app/protected/
```

---

## 4. Phase 1 — Data Layer

### Step 1.1: Create TypeScript Types

**File: `lib/types.ts`**

Define every data shape used across the app:

```ts
export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  originalPrice: number | null;    // null = no discount
  image: string;                    // primary image URL
  images: string[];                 // all images (for gallery)
  clubPoint: number;
  category: string;                 // category slug
  categoryName: string;             // display name
  brand: string;
  description: string;              // HTML string
  sku: string;
  tags: string[];
  colors: ProductColor[];
  sizes: string[];
  inStock: boolean;
  stockCount: number;
  seller: Seller;
  rating: number;                   // 0-5
  reviewCount: number;
}

export interface ProductColor {
  name: string;
  hex: string;                      // e.g. "#000000"
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;                     // Lucide icon name
  image: string;
  productCount: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
}

export interface BannerSlide {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  link: string;
  buttonText: string;
}

export interface FlashDeal {
  product: Product;
  dealEndTime: string;              // ISO date string
  discountPercent: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;                  // HTML string
  image: string;
  date: string;
  author: string;
}

export interface Seller {
  id: string;
  name: string;
  slug: string;
  logo: string;
  rating: number;
  productCount: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string | null;
  selectedSize: string | null;
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
  memberSince: string;
}
```

### Step 1.2: Create Placeholder Data

**File: `lib/placeholder-data.ts`**

This is the largest data file. Export 15+ products, 10 categories, 15 brands, 4 banner slides, 5 flash deals, 5 blog posts.

**Important rules for placeholder data:**
- Use `placehold.co` URLs for images: `https://placehold.co/400x400/e2e8f0/4a5568?text=Product+Name`
- Use realistic product titles from the actual site (Dell laptops, Gucci bags, Puma jackets, etc.)
- Prices should be realistic ($84.99, $514.00, $2,250.00, etc.)
- Every product MUST have a unique `slug` (URL-safe: lowercase, hyphens)
- `clubPoint` is always `0` (matching the real site)
- Categories MUST match the real site's categories exactly

```ts
// Structure (implement with full data):
import { Product, Category, Brand, BannerSlide, FlashDeal, BlogPost, Shop } from "./types";

export const categories: Category[] = [
  { id: "1", name: "Women Clothing & Fashion", slug: "women-clothing-fashion", icon: "Shirt", image: "...", productCount: 45 },
  { id: "2", name: "Computer & Accessories", slug: "computer-accessories", icon: "Monitor", image: "...", productCount: 32 },
  { id: "3", name: "Kids & Toy", slug: "kids-toy", icon: "Baby", image: "...", productCount: 28 },
  { id: "4", name: "Sports & Outdoor", slug: "sports-outdoor", icon: "Dumbbell", image: "...", productCount: 35 },
  { id: "5", name: "Automobile & Motorcycle", slug: "automobile-motorcycle", icon: "Car", image: "...", productCount: 12 },
  { id: "6", name: "Phone Accessories", slug: "phone-accessories", icon: "Smartphone", image: "...", productCount: 20 },
  { id: "7", name: "Women's Fashion Bag", slug: "womens-fashion-bag", icon: "ShoppingBag", image: "...", productCount: 38 },
  { id: "8", name: "Beauty, Health & Hair", slug: "beauty-health-hair", icon: "Sparkles", image: "...", productCount: 25 },
  { id: "9", name: "Jewelry & Watches", slug: "jewelry-watches", icon: "Watch", image: "...", productCount: 30 },
  { id: "10", name: "Men Clothing & Fashion", slug: "men-clothing-fashion", icon: "Shirt", image: "...", productCount: 40 },
];

export const brands: Brand[] = [
  { id: "1", name: "ACER", slug: "acer", logo: "..." },
  { id: "2", name: "Adidas", slug: "adidas", logo: "..." },
  { id: "3", name: "Apple", slug: "apple", logo: "..." },
  { id: "4", name: "ASUS", slug: "asus", logo: "..." },
  // ... 15+ total
];

export const products: Product[] = [
  // 15+ products with full data
  // Distribute across categories
];

export const bannerSlides: BannerSlide[] = [
  // 3-4 hero banners
];

export const flashDeals: FlashDeal[] = [
  // 5 items with countdown timers
];

export const blogPosts: BlogPost[] = [
  // 5 blog posts
];

export const shops: Shop[] = [
  // 3-4 sample shops
];
```

### Step 1.3: Create Zustand Stores

**File: `lib/store.ts`**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem, Product } from "./types";

// ─── Cart Store ───────────────────────────────────────────────

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, color?: string | null, size?: string | null) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1, color = null, size = null) => {
        const items = get().items;
        const existing = items.find((i) => i.product.id === product.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.product.id === product.id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({
            items: [...items, { product, quantity, selectedColor: color, selectedSize: size }],
          });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.product.id !== productId) }),
      updateQuantity: (productId, quantity) =>
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        }),
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
    }),
    { name: "seller-store-cart" }
  )
);

// ─── Wishlist Store ───────────────────────────────────────────

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        if (!get().items.find((i) => i.id === product.id)) {
          set({ items: [...get().items, product] });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.id !== productId) }),
      isInWishlist: (productId) => get().items.some((i) => i.id === productId),
    }),
    { name: "seller-store-wishlist" }
  )
);
```

> **Key:** Both stores use `persist` middleware to save to `localStorage`, so cart/wishlist survive page refreshes.

---

## 5. Phase 2 — Global Shell

### Step 2.1: Top Bar Component

**File: `components/header/top-bar.tsx`**

```
┌────────────────────────────────────────────────────────────┐
│ 🌐 English ▾  │  Today's Deals  │  Brands  ║  Login  Registration  Seller Zone │
└────────────────────────────────────────────────────────────┘
```

- Background: `bg-gray-50` (the lightest gray from the site)
- Text: `text-xs text-muted-foreground`
- Height: `h-8`
- **Hidden on mobile:** `hidden md:block`
- Left side: Globe icon + "English" dropdown, pipe separator, "Today's Deals" link, "Brands" link
- Right side: "Login" link → `/users/login`, "Registration" link → `/users/registration`, "Seller Zone" link → `/seller/login`
- All links are plain text (no underline) with hover:text-primary transition
- **Container:** `max-w-7xl mx-auto px-4` (consistent with all sections)

### Step 2.2: Main Header (Sticky)

**File: `components/header/main-header.tsx`**

```
┌────────────────────────────────────────────────────────────┐
│  SELLER STORE      │ [All Categories ▾] [Search...🔍]  │ 🔔  ♡  🛍(2) │
└────────────────────────────────────────────────────────────┘
```

- Background: `bg-white`
- Height: `h-16`
- **Sticky:** `sticky top-0 z-50 shadow-sm`
- **Logo (left):**
  - Text "Seller Store" in `text-xl font-bold text-primary`
  - Linked to `/` with `<Link>`
  - On mobile: smaller `text-lg`
  
- **Search Bar (middle):**
  - Wrapper: `flex items-center flex-1 max-w-2xl mx-4`
  - Left button: "All Categories" dropdown trigger (uses `Select` or `DropdownMenu`)
  - Input: `flex-1` full-width text input with `placeholder="Search products..."` 
  - Right button: Blue search icon button `bg-primary text-white rounded-r-md`
  - **On mobile:** Search bar hidden, replaced by a `Search` icon that expands an overlay or Sheet
  
- **Action Icons (right):**
  - Bell icon: `<Bell size={20} />` with `<Link href="/all-notifications">`
  - Heart icon: `<Heart size={20} />` with badge count from `useWishlistStore`
  - Cart icon: `<ShoppingBag size={20} />` with badge count from `useCartStore`
  - Badge: small red circle `bg-destructive text-white text-[10px] rounded-full w-4 h-4` positioned absolutely
  - **On mobile:** Show only Cart icon + Hamburger menu `<Menu />` that triggers `<Sheet>` with full nav

- **Mobile Sheet Contents:**
  - Logo at top
  - Search bar
  - Navigation links (Home, Flash Sale, Blogs, All Brands)
  - Category list
  - Auth links (Login, Register)
  - Close button `<X />`

### Step 2.3: Navigation Bar

**File: `components/header/nav-bar.tsx`**

```
┌────────────────────────────────────────────────────────────┐
│  Home    Flash Sale    Blogs    All Brands                 │
└────────────────────────────────────────────────────────────┘
```

- Background: `bg-white` with `border-b border-gray-100`
- Height: `h-10`
- **Hidden on mobile:** `hidden md:block`
- Links: `text-sm font-medium text-foreground hover:text-primary transition-colors`
- Active link: `text-primary font-semibold` (detect via `usePathname()`)
- Links are laid out with `flex items-center gap-8` inside `max-w-7xl mx-auto px-4`
- Link targets:
  - Home → `/`
  - Flash Sale → `/flash-deals`
  - Blogs → `/blog`
  - All Brands → `/brands`

### Step 2.4: Mobile Bottom Navigation

**File: `components/header/mobile-bottom-nav.tsx`**

```
┌──────┬──────┬──────┬──────┬──────┐
│ 🏠   │ 📂   │ 🛒   │ 🔔   │ 👤   │
│ Home │ Cat. │ Cart │ Ntfy │ Acct │
└──────┴──────┴──────┴──────┴──────┘
```

- Position: `fixed bottom-0 left-0 right-0 z-50`
- Height: `h-14`
- Background: `bg-white border-t border-gray-200`
- **Visible only on mobile:** `md:hidden`
- Layout: `flex items-center justify-around`
- Each item: column flex (icon on top, label below)
  - Icon size: `20`
  - Label: `text-[10px] mt-0.5`
  - Active state: `text-primary` (compare current path)
- Items:
  - Home → `/` → `<Home />`
  - Categories → `/categories` → `<Grid3X3 />`
  - Cart → `/cart` → `<ShoppingBag />` + badge count
  - Notifications → TBD → `<Bell />`
  - Account → `/users/login` (or `/account` if logged in) → `<User />`

### Step 2.5: Compose Header

**File: `components/header/index.tsx`**

Simply imports and stacks the 3 bars:

```tsx
import { TopBar } from "./top-bar";
import { MainHeader } from "./main-header";
import { NavBar } from "./nav-bar";

export function Header() {
  return (
    <header>
      <TopBar />
      <MainHeader />
      <NavBar />
    </header>
  );
}
```

### Step 2.6: Footer

**File: `components/footer.tsx`**

```
┌────────────────────────────────────────────────────────────┐
│ SELLER STORE              │ NEWSLETTER │ QUICK LINKS │ ... │
│ Description paragraph     │ [email][→] │ Terms       │ ... │
│                           │ MOBILE APPS│ Return Pol. │ ... │
│                           │ 📱  📱     │ Support Pol.│ ... │
├────────────────────────────────────────────────────────────┤
│ Copyright © 2025 Seller Store. All Rights Reserved.       │
│ [Visa] [MC] [Amex] [PayPal]                               │
└────────────────────────────────────────────────────────────┘
```

- Background: `bg-gray-900 text-gray-300`
- Top section: `py-12` padding
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8`
  
**Column 1 — About:**
  - "Seller Store" in `text-xl font-bold text-white`
  - Description paragraph (the "Ess by Ebay is a modern..." text)
  - Text: `text-sm text-gray-400 leading-relaxed`

**Column 2 — Newsletter + Mobile Apps:**
  - "NEWSLETTER" heading in `text-sm font-semibold text-white uppercase tracking-wider mb-4`
  - Email input + Subscribe button row
  - "MOBILE APPS" heading
  - Two placeholder app store badge images

**Column 3 — Quick Links:**
  - Heading: "QUICK LINKS"
  - Links: Terms, Return Policy, Support Policy, Privacy Policy
  - Each: `text-sm text-gray-400 hover:text-white transition-colors block py-1`

**Column 4 — Contacts:**
  - Heading: "CONTACTS"
  - `<MapPin />` Address: 123 Main St, San Jose, CA 95131
  - `<Mail />` Email: support@sellerstore.com
  - `<Phone />` Phone: +1 (408) 555-0123

**Column 5 — My Account + Seller Zone:**
  - "MY ACCOUNT" heading → Login, Registration, Order Tracking links
  - "SELLER ZONE" heading → Become a Seller link

**Bottom Bar:**
  - `border-t border-gray-700 mt-8 pt-6`
  - `flex flex-col md:flex-row justify-between items-center`
  - Left: Copyright text
  - Right: 4-5 payment method placeholder images (small, grayscale)

### Step 2.7: Global Layout

**File: `app/layout.tsx`**

The root layout composes everything:

```tsx
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/header/mobile-bottom-nav";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Seller Store — Multi-Vendor eCommerce Marketplace",
  description: "Modern multi-vendor eCommerce marketplace connecting customers with trusted sellers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Header />
        <main className="min-h-screen pb-14 md:pb-0">
          {children}
        </main>
        <Footer />
        <MobileBottomNav />
      </body>
    </html>
  );
}
```

> **Note:** `pb-14 md:pb-0` on main adds bottom padding on mobile to prevent content from being hidden behind the fixed bottom nav.

---

## 6. Phase 3 — Reusable Components

### Step 3.1: Product Card

**File: `components/product-card.tsx`**

This is the MOST reused component (appears on homepage, shop, flash deals, search results, related products).

```
┌─────────────────────┐
│  [Product Image]    │  ← aspect-square, object-cover
│         ♡  👁  ⇄   │  ← overlay action icons (top-right)
├─────────────────────┤
│  Product Title That │  ← text-sm font-medium line-clamp-2
│  May Span Two Lines │
│                     │
│  $254.99            │  ← text-destructive font-bold
│  Club Point: 0      │  ← text-xs text-muted-foreground
│                     │
│  [  Add to Cart  ]  │  ← full-width Button variant="outline"
└─────────────────────┘
```

**Props Interface:**
```ts
interface ProductCardProps {
  product: Product;
  variant?: "default" | "compact";  // compact = used in flash deals horizontal scroll
}
```

**Implementation Rules:**
- Use `"use client"` directive (needs Zustand stores for wishlist/cart)
- Card wrapper: `group relative bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden`
- Image area: `relative aspect-square overflow-hidden`
  - Use `<Image>` with `fill` and `className="object-cover group-hover:scale-105 transition-transform duration-300"`
  - Action icons: `absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity`
  - Each icon: `w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-primary hover:text-white transition-colors`
- Content area: `p-3`
  - Title: `<Link>` wrapping `text-sm font-medium line-clamp-2 hover:text-primary h-10` (fixed height for alignment)
  - Price: `text-base font-bold text-destructive mt-1`
  - If `originalPrice`: `<span className="text-xs text-muted-foreground line-through ml-2">${originalPrice}</span>`
  - Club Point: `text-xs text-muted-foreground mt-1` → "Club Point: 0"
  - Add to Cart: `<Button variant="outline" size="sm" className="w-full mt-2">Add to Cart</Button>`
  - On click: `useCartStore.getState().addItem(product)`

### Step 3.2: Section Header

**File: `components/section-header.tsx`**

```
New Products                                [View all →]
────────────────────────────────────────────────────────
```

**Props:**
```ts
interface SectionHeaderProps {
  title: string;
  badge?: string;        // e.g. "Hot" for flash deals
  viewAllHref?: string;  // if provided, show "View all →" link
}
```

- Layout: `flex items-center justify-between mb-6`
- Title: `text-lg font-semibold text-foreground`
- Badge: `<Badge variant="destructive" className="ml-2">{badge}</Badge>`
- View All: `<Link className="text-sm text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>`

### Step 3.3: Category Card

**File: `components/category-card.tsx`**

Small rounded card with icon/image + label. Used in "Top Categories" grid.

```
  ┌──────────┐
  │   📷     │  ← 80x80 image or icon, rounded-lg
  │ Category │  ← text-xs text-center font-medium
  └──────────┘
```

**Props:** `{ category: Category }`

- Wrapper: `<Link>` to `/category/${category.slug}`
- `flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors`
- Image: `w-16 h-16 rounded-full bg-gray-100 overflow-hidden` (or icon fallback)
- Label: `text-xs font-medium text-center line-clamp-2`

### Step 3.4: Brand Card

**File: `components/brand-card.tsx`**

```
  ┌──────────┐
  │  [Logo]  │
  │  Brand   │
  └──────────┘
```

**Props:** `{ brand: Brand }`

- `<Link>` to `/brands` (or specific brand page)
- `flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow min-w-[120px]`
- Logo: `w-16 h-16 object-contain`
- Name: `text-xs font-medium text-muted-foreground`

### Step 3.5: Breadcrumb Nav

**File: `components/breadcrumb-nav.tsx`**

Wraps shadcn Breadcrumb for consistent use:

**Props:**
```ts
interface BreadcrumbItem {
  label: string;
  href?: string;   // last item has no href (current page)
}
interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}
```

- Always starts with "Home" → `/`
- Uses shadcn `Breadcrumb`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbSeparator`
- Separator: `<ChevronRight size={14} />`
- `mb-4 text-sm`

### Step 3.6: Quantity Selector

**File: `components/quantity-selector.tsx`**

```
  [ - ]  [ 3 ]  [ + ]
```

**Props:**
```ts
interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}
```

- `"use client"`
- Layout: `flex items-center border border-gray-200 rounded-md`
- Minus button: `w-8 h-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50`
- Value display: `w-10 h-8 flex items-center justify-center text-sm font-medium border-x border-gray-200`
- Plus button: mirror of minus
- Disable minus when `value <= min` (default 1)
- Disable plus when `value >= max` (default 999)

---

## 7. Phase 4 — Homepage

### Step 4.1: Homepage Layout

**File: `app/page.tsx`**

This is a **Server Component** (no `"use client"` directive). It imports placeholder data and renders sections.

**Structure:**

```tsx
export default function HomePage() {
  return (
    <div>
      {/* Section 1: Hero */}
      <HeroSection />

      {/* Section 2: Flash Deals / Today's Deal */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <FlashDealsRow />
      </section>

      {/* Section 3: Top Categories */}
      <section className="max-w-7xl mx-auto px-4 py-8 bg-gray-50">
        <TopCategoriesGrid />
      </section>

      {/* Section 4: New Products */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <NewProductsGrid />
      </section>

      {/* Section 5: Per-Category Featured (repeating) */}
      {categories.slice(0, 8).map((category) => (
        <CategoryFeaturedSection key={category.id} category={category} />
      ))}

      {/* Section 6: Top Brands */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <TopBrandsRow />
      </section>
    </div>
  );
}
```

### Step 4.2: Hero Section

```
┌───────────┬──────────────────────────────────────┐
│ Women's   │                                      │
│ Computer  │     [  HERO BANNER CAROUSEL  ]       │
│ Kids      │     < ●○○○ >                         │
│ Sports    │                                      │
│ Auto      │                                      │
└───────────┴──────────────────────────────────────┘
```

**Implementation:**

- Wrap in `max-w-7xl mx-auto px-4 py-4`
- Layout: `flex gap-4`
- **Left sidebar (25% width):**
  - `hidden md:block w-64 flex-shrink-0`
  - `bg-white rounded-lg border border-gray-100 shadow-sm p-0 overflow-hidden`
  - List of categories: each item is a `<Link>` with `flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 hover:text-primary transition-colors border-b border-gray-50`
  - Icon + category name for each
  
- **Right carousel (75% width):**
  - `flex-1`
  - Use shadcn `<Carousel>` component (wraps embla-carousel-react)
  - Each slide: `relative aspect-[16/7] rounded-lg overflow-hidden bg-gray-100`
  - Slide content: large background image + text overlay with title, subtitle, CTA button
  - Navigation: prev/next buttons + dot indicators
  - `autoplay` with 5-second interval

- **On mobile:**
  - Sidebar hidden (`hidden md:block`)
  - Carousel: `aspect-[16/9]` full-width

### Step 4.3: Flash Deals Row

**"TODAYS DEAL" with "Hot" badge**

- `<SectionHeader title="TODAYS DEAL" badge="Hot" />`
- Scrollable container: `flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory`
  - Hide scrollbar: `[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`
- Each item: `snap-start flex-shrink-0 w-[200px] md:w-[220px]`
- Uses `<ProductCard variant="compact" />` for each flash deal product
- Min 5 items to enable horizontal scrolling

### Step 4.4: Top Categories Grid

- `<SectionHeader title="Top Categories" />`
- Grid: `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4`
- Maps `categories` → `<CategoryCard key={cat.id} category={cat} />`

### Step 4.5: New Products Grid

- `<SectionHeader title="New Products" viewAllHref="/search" />`
- Grid: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4`
- Maps `products.slice(0, 10)` → `<ProductCard />`

### Step 4.6: Category Featured Sections

For each major category, render a section with:

```
Women Clothing & Fashion                    [View all →]
────────────────────────────────────────────────────────
[Card] [Card] [Card] [Card] [Card] ...   (scrollable)
```

- `<SectionHeader title={category.name} viewAllHref={`/category/${category.slug}`} />`
- Same horizontal scroll pattern as Flash Deals
- Filter `products` by `category` field and show 3-6 matching

### Step 4.7: Top Brands Row

- `<SectionHeader title="Top Brands" viewAllHref="/brands" />`
- Horizontal scrollable: `flex gap-4 overflow-x-auto pb-4`
- Maps `brands` → `<BrandCard />`

---

## 8. Phase 5 — Product Detail Page

### Step 5.1: Page Structure

**File: `app/product/[slug]/page.tsx`**

```tsx
// Server Component — fetches product by slug
import { products } from "@/lib/placeholder-data";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "./product-detail-client";

// Dynamic metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const product = products.find((p) => p.slug === params.slug);
  return {
    title: product ? `${product.title} | Seller Store` : "Product Not Found",
    description: product?.description?.slice(0, 160),
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = products.find((p) => p.slug === params.slug);
  if (!product) notFound();
  
  const relatedProducts = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
}
```

### Step 5.2: Product Detail Client Component

**File: `app/product/[slug]/product-detail-client.tsx`**

```
"use client"

┌──────────────────────────────────────────────────────────────┐
│ Home / Category / Product Name                    (breadcrumb)│
├────────────────────────┬─────────────────────────────────────┤
│                        │  PRODUCT TITLE (H1)                 │
│   [MAIN IMAGE]         │  ⭐⭐⭐⭐☆ (3 reviews)              │
│                        │  Sold by: Store Name                │
│   [thumb][thumb][thumb] │  Brand: [Dell]                      │
│                        │                                     │
│                        │  Price: $514.00                     │
│                        │  ──────────────────                 │
│                        │  Color:  ⚫ ⚪ 🔴                   │
│                        │  Size:   [S] [M] [L] [XL]          │
│                        │                                     │
│                        │  Qty: [- 1 +]  (1000 available)    │
│                        │                                     │
│                        │  [ Add to Cart ] [ BUY NOW ]        │
│                        │  ♡ Add to wishlist  ⇄ Compare      │
│                        │                                     │
│                        │  Refund: View Policy                │
│                        │  Share: 📘 🐦 📌                    │
├────────────────────────┴─────────────────────────────────────┤
│  [Description] [Reviews] [Seller Info]              (tabs)   │
│ ─────────────────────────────────────────────────────────── │
│  Tab content area...                                         │
├──────────────────────────────────────────────────────────────┤
│  Related Products                                            │
│  [Card] [Card] [Card] [Card]                                 │
├──────────────────────────────────────────────────────────────┤
│  Product Queries                                             │
│  Login or Register to submit questions to seller             │
└──────────────────────────────────────────────────────────────┘
```

**Key Implementation Details:**

**Image Gallery:**
- State: `const [selectedImage, setSelectedImage] = useState(0)`
- Main image: `relative aspect-square rounded-lg overflow-hidden bg-gray-50` with `<Image>` fill
- Thumbnails: `flex gap-2 mt-4`
  - Each: `w-16 h-16 rounded border-2 cursor-pointer` — `border-primary` when selected, `border-gray-200` otherwise
  - On click: `setSelectedImage(index)`

**Price Section:**
- Current price: `text-2xl font-bold text-destructive`
- Original price (if exists): `text-lg text-muted-foreground line-through ml-2`
- "/": separator between prices

**Variant Selectors:**
- Color: Circular buttons `w-8 h-8 rounded-full border-2` with `style={{ backgroundColor: color.hex }}`
  - Selected: `ring-2 ring-primary ring-offset-2`
- Size: `<Button variant="outline" size="sm">` — selected variant gets `variant="default"` (filled)

**Quantity + Actions:**
- `<QuantitySelector>` with max = `product.stockCount`
- "Total Price:" calculated dynamically = price × quantity
- "Add to Cart": `<Button variant="outline" className="flex-1">` — calls `useCartStore.addItem()`
- "BUY NOW": `<Button className="flex-1">` — adds to cart & redirects to `/cart`
- On mobile: both buttons full-width, stacked

**Tabs Section:**
- Use shadcn `<Tabs defaultValue="description">`
  - `TabsTrigger` values: "description", "reviews", "seller-info"
  - Description: `<div dangerouslySetInnerHTML={{ __html: product.description }} />`
  - Reviews: Placeholder review list or "No reviews yet" state
  - Seller Info: Seller name, rating, "Message Seller" button

**Related Products:**
- `<SectionHeader title="Related Products" />`
- `grid grid-cols-2 md:grid-cols-4 gap-4`

---

## 9. Phase 6 — Shop Pages

### Step 6.1: Shop Landing Page

**File: `app/shop/[shopSlug]/page.tsx`**

```
┌────────────────────────────────────────────────────┐
│ Home / Shop / JWS Collections           (breadcrumb)│
├──────────┬─────────────────────────────────────────┤
│ FILTERS  │  [Shop Banner Image]                    │
│          │  Shop Name · ⭐4.5 · 150 products       │
│ Price    │                                         │
│ [——●——]  │  Sort by: [Newest ▾]    Showing 1-12   │
│ $0-$5000 │ ┌──────┬──────┬──────┬──────┐          │
│          │ │ Card │ Card │ Card │ Card │          │
│ Brands   │ ├──────┼──────┼──────┼──────┤          │
│ ☑ Nike   │ │ Card │ Card │ Card │ Card │          │
│ ☐ Adidas │ ├──────┼──────┼──────┼──────┤          │
│ ☐ Puma   │ │ Card │ Card │ Card │ Card │          │
│          │ └──────┴──────┴──────┴──────┘          │
│ Category │                                         │
│ ☑ Men's  │  [< Previous] [1] [2] [3] [Next >]    │
│ ☐ Women  │                                         │
└──────────┴─────────────────────────────────────────┘
```

**Sidebar (client component):**
- `hidden md:block w-64 flex-shrink-0 space-y-6`
- **Price Range:** shadcn `<Slider>` with range values `[0, 5000]`, display: "$0 — $5,000"
- **Brands:** Checkbox list using shadcn `<Checkbox>` — filter updates URL search params
- **Categories:** Checkbox list of categories
- **Mobile:** Sidebar replaced by `<Sheet>` triggered by `<Button variant="outline"><Filter /> Filters</Button>`

**Product Grid:**
- Sort dropdown: shadcn `<Select>` with options: "Newest", "Price: Low to High", "Price: High to Low", "Best Rating"
- Grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`
- Pagination: shadcn `<Pagination>` at bottom

### Step 6.2: Top Selling & All Products Sub-Pages

**Files:**
- `app/shop/[shopSlug]/top-selling/page.tsx`
- `app/shop/[shopSlug]/all-products/page.tsx`

These reuse the same layout as the shop landing page but with different product filtering/sorting defaults.

### Step 6.3: Become a Seller Page

**File: `app/shop/create/page.tsx`**

Simple form page:
- Breadcrumb: Home / Become a Seller
- H1: "Become a Seller"
- Form: Business Name, Email, Phone, Description, "Submit Application" button
- Placeholder — just visual, no real backend

---

## 10. Phase 7 — Blog Pages

### Step 7.1: Blog Listing

**File: `app/blog/page.tsx`**

```
Home / Blog

# Blog

┌──────────────┬──────────────┬──────────────┐
│ [Blog Image] │ [Blog Image] │ [Blog Image] │
│ Title        │ Title        │ Title        │
│ Date · Author│ Date · Author│ Date · Author│
│ Excerpt...   │ Excerpt...   │ Excerpt...   │
│ [Read More →]│ [Read More →]│ [Read More →]│
└──────────────┴──────────────┴──────────────┘
```

- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Each blog card: white card with image (aspect-video), title (font-semibold), date + author (text-xs text-muted-foreground), excerpt (text-sm line-clamp-3), "Read More" link

### Step 7.2: Single Blog Post

**File: `app/blog/[slug]/page.tsx`**

- Breadcrumb: Home / Blog / Post Title
- H1: Post title
- Meta: Date · Author
- Featured image: `aspect-video w-full rounded-lg`
- Content: `prose` (Tailwind Typography or manual styling) — `max-w-3xl mx-auto`
- Related Posts section at bottom

---

## 11. Phase 8 — Static & Utility Pages

### Step 8.1: Brands Page

**File: `app/brands/page.tsx`**

- Breadcrumb: Home / All Brands
- H1: "All Brands"
- Grid: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4`
- Each brand: `<BrandCard />`

### Step 8.2: Categories Page

**File: `app/categories/page.tsx`**

- Same structure as brands but with `<CategoryCard />`
- Grid: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6`

### Step 8.3: Flash Deals Page

**File: `app/flash-deals/page.tsx`**

- Breadcrumb: Home / Flash Deals
- H1: "Flash Deals"
- Countdown timer banner (client component)
- Product grid using flash deal products

### Step 8.4: Legal Pages

**Files:** `app/(legal)/terms/page.tsx`, `return-policy/page.tsx`, `support-policy/page.tsx`, `privacy-policy/page.tsx`

All share the same template:

```tsx
export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Terms & Conditions" }]} />
      <h1 className="text-2xl font-bold mb-6">Terms & Conditions</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        {/* Placeholder legal text paragraphs */}
      </div>
    </div>
  );
}
```

### Step 8.5: Affiliate Page

**File: `app/affiliate/page.tsx`**

- Breadcrumb + H1
- Info sections about the affiliate program (commission model, payout cycle, policy summary)
- "Join Now" CTA button
- Functional lead form (name, email, website/social URL, traffic source)
- Success + validation + failure states (inline errors and confirmation message)

### Step 8.6: Track Order Page

**File: `app/track-your-order/page.tsx`**

- Breadcrumb + H1
- Form: Order ID + Email/Phone verification input + "Track" button
- Results area (fully functional UI states):
  - Not found
  - Found + status timeline (`Pending` → `Processing` → `Shipped` → `Delivered`)
  - Delivery ETA + shipment reference
  - Error / retry state

### Step 8.7: 404 Page

**File: `app/not-found.tsx`**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <p className="text-xl mt-4 text-muted-foreground">Page Not Found</p>
      <p className="text-sm text-muted-foreground mt-2">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button className="mt-6">Back to Home</Button>
      </Link>
    </div>
  );
}
```

---

## 12. Phase 9 — Auth Pages

### Understanding the Auth Flow

The existing Supabase integration handles authentication. We're replacing the UI while keeping the Supabase client calls.

**Key Supabase functions used:**
- `supabase.auth.signInWithPassword({ email, password })` — Login
- `supabase.auth.signUp({ email, password })` — Registration
- `supabase.auth.resetPasswordForEmail(email)` — Forgot Password
- `supabase.auth.signOut()` — Logout
- `supabase.auth.getUser()` — Check current session

### Step 9.1: Login Page

**File: `app/(auth)/users/login/page.tsx`**

```
┌──────────────────────────────┐
│        Login to your         │
│          account             │
│                              │
│  Email                       │
│  [________________]          │
│                              │
│  Password                    │
│  [________________]          │
│                              │
│  [     Login     ]           │
│                              │
│  Forgot password?            │
│  Don't have an account?      │
│  Create one                  │
└──────────────────────────────┘
```

- `"use client"` — form interaction + Supabase calls
- Centered card: `max-w-md mx-auto mt-12 p-8`
- Uses `createClient()` from `@/lib/supabase/client`
- On success: `router.push("/account")` or `router.push("/")`

### Step 9.2: Registration Page

**File: `app/(auth)/users/registration/page.tsx`**

Same visual structure:
- Fields: Full Name, Email, Password, Confirm Password
- "Sign Up" button
- After success: redirect to login or show success message
- Link to login: "Already have an account?"

### Step 9.3: Seller Login

**File: `app/(auth)/seller/login/page.tsx`**

- Same as customer login but with "Seller Login" heading
- Could add seller-specific fields later

### Step 9.4: Password Reset

**File: `app/(auth)/password/reset/page.tsx`**

- Email input only
- "Send Reset Link" button
- Success state: "Check your email for a reset link"

### Step 9.5: Account Dashboard

**File: `app/account/page.tsx`**

Protected page (middleware redirects unauthenticated users):

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/users/login");
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Account</h1>
      {/* User info, order history, etc. */}
    </div>
  );
}
```

### Step 9.6: Seller Dashboard (Fully Functional)

**Base Layout Files:**
- `app/seller/(dashboard)/layout.tsx`
- `components/seller/sidebar.tsx`
- `components/seller/seller-header.tsx`

**Required UX Shell:**
- Desktop: fixed sidebar + top header + scrollable content area
- Mobile: sidebar in `<Sheet>` with persistent page title + quick actions in header
- Active nav highlighting via `usePathname()`
- Global dashboard states: skeleton loading, empty state cards, and action toasts

**Protected Access Rules:**
- Unauthenticated users → redirect to `/seller/login`
- Authenticated non-seller users → redirect to `/account` with explanatory toast
- Seller users must be able to access all dashboard children routes

**Step 9.6.1 — Seller Home (`/seller/dashboard`)**
- KPI cards: total sales, pending orders, completed orders, available balance
- Sales overview chart (7d/30d toggle)
- Recent orders table (latest 5)
- Low-stock alert list from storehouse data

**Step 9.6.2 — Products (`/seller/products`)**
- Product table with search, filter (status/category), sort, pagination
- Create/Edit/Delete product actions with confirmation dialogs
- Image upload field + preview, price/stock validation, slug auto-generation
- Bulk actions: publish/unpublish, mark out of stock

**Step 9.6.3 — Orders (`/seller/orders`)**
- Order list with status filters and date range
- Row actions: view details, update status, print invoice
- Order detail panel with customer info, line items, shipping, notes
- Status transition guardrails (can’t skip invalid status path)

**Step 9.6.4 — Payments (`/seller/payments`)**
- Transaction ledger (credits/debits) with running balance
- Payout history table with status badges
- Export action (CSV) for filtered range

**Step 9.6.5 — Withdraw (`/seller/withdraw`)**
- Withdraw form with amount validation against available balance
- Method selector (Bank/PayPal/etc.) and required method fields
- Withdraw request table with approval status and timestamps

**Step 9.6.6 — Commission (`/seller/commission`)**
- Commission rules summary card
- Commission transaction breakdown by order
- Total commission this month + lifetime

**Step 9.6.7 — Conversations (`/seller/conversations`)**
- Inbox list + thread view layout
- Message composer with send state + optimistic append
- Unread count badges and thread search

**Step 9.6.8 — Support (`/seller/support`)**
- Ticket list (open/pending/closed)
- Create new ticket form with subject, priority, description, attachments
- Ticket detail with reply timeline

**Step 9.6.9 — Storehouse (`/seller/storehouse`)**
- Inventory table with per-SKU stock, reserved, and available columns
- Quick adjust action (+/- stock) with reason field
- Low-stock filters and alerts

**Step 9.6.10 — Files (`/seller/files`)**
- Media library grid/list toggle
- Upload, rename, delete, and copy-link actions
- File type filters + size display

**Step 9.6.11 — Settings (`/seller/settings`)**
- Store profile form (name, logo, banner, contact, address)
- Business settings (shipping defaults, return policy text, notification prefs)
- Save flow with dirty-state warning on navigation away

> **Important:** No seller dashboard page should remain “UI-only placeholder”. Every page must provide meaningful data rendering and primary actions, even if backed by mock data during Phase 1.

---

## 13. Phase 10 — Cart & Search

### Step 10.1: Cart Page

**File: `app/cart/page.tsx`**

```
"use client"

Home / Cart

# Shopping Cart (3 items)

┌───────────────────────────────────────────────────────────────┐
│ [Image] │ Product Title          │ $254.99 │ [- 2 +] │ 🗑  │
├─────────┼────────────────────────┼─────────┼─────────┼─────┤
│ [Image] │ Another Product Name   │ $514.00 │ [- 1 +] │ 🗑  │
├─────────┼────────────────────────┼─────────┼─────────┼─────┤
│ [Image] │ Third Product Here     │  $84.99 │ [- 1 +] │ 🗑  │
└─────────┴────────────────────────┴─────────┴─────────┴─────┘

                                     Subtotal:  $853.98
                                     Shipping:  Calculated at checkout
                                     ─────────────────────
                                     Total:     $853.98
                                     
                                     [   Proceed to Checkout   ]
```

**Implementation:**
- `"use client"` — reads from `useCartStore`
- **Empty state:** If no items, show "Your cart is empty" with illustration and "Continue Shopping" button
- **Table (Desktop):** `<table>` with columns: Product, Price, Quantity, Action
  - Product cell: image (60x60) + title link
  - Quantity: `<QuantitySelector />`
  - Action: Trash icon button → `removeItem()`
- **Mobile:** Cards stacked vertically (not table)
- **Summary:** Right-aligned or full-width on mobile. Subtotal, Shipping note, Total, CTA button

### Step 10.2: Search Page

**File: `app/search/page.tsx`**

```tsx
"use client"

// Reads ?q= from URL search params
// Filters products by title match (case-insensitive)
// Displays results in standard product grid
```

- Uses `useSearchParams()` to read `q` query
- Header shows: `Showing results for "${query}"` or "All Products" if no query
- Product grid: `grid grid-cols-2 md:grid-cols-4 gap-4`
- No results state: "No products found matching your search"

---

## 14. Phase 11 — Final Polish & QA

### Step 11.1: Loading States

Add `loading.tsx` for key routes:

```tsx
// app/loading.tsx (or per-route)
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 11.2: SEO Metadata

Add metadata to every page:

```tsx
// Static pages
export const metadata = {
  title: "Flash Deals | Seller Store",
  description: "...",
};

// Dynamic pages — use generateMetadata()
export async function generateMetadata({ params }) {
  // ...
}
```

### Step 11.3: Accessibility Audit

- All images have `alt` text
- All interactive elements are keyboard accessible
- Focus indicators visible (Tailwind `focus-visible:ring-2`)
- Color contrast meets WCAG AA (check destructive red on white → passes at `text-base`)
- ARIA labels on icon-only buttons: `<Button aria-label="Add to wishlist">`
- Skip-to-content link in layout (optional but recommended)

### Step 11.4: Performance Audit

Follow the [Vercel React Best Practices](https://vercel.com/blog/how-to-optimize-react-performance):

- ✅ Server Components for all data-fetching pages (homepage, product, shop)
- ✅ Client Components only for interactive islands (cart, wishlist, variant selectors)
- ✅ `next/image` for all images (automatic optimization, lazy loading)
- ✅ Dynamic imports for heavy components: `const Carousel = dynamic(() => import("..."))`
- ✅ No barrel file imports — import directly from component files
- ✅ Zustand stores are lightweight, no Provider wrapping needed
- ✅ `Inter` font with `display: "swap"` for fast text rendering

### Step 11.5: Full-Functionality Checklist (All Pages)

Each route in the app must pass all items below:

1. **Primary action works end-to-end** (example: submit form, save settings, add item, update status)
2. **Secondary actions are not dead links** (view details, back, cancel, clear filters, retry)
3. **State coverage** includes loading, empty, error, success
4. **Validation coverage** includes required fields, format checks, min/max rules
5. **URL persistence** for list pages (filters, search, pagination, sort)
6. **Feedback quality** includes inline field errors + toasts for async actions
7. **Accessibility quality** includes keyboard-only flow, focus states, semantic labels
8. **Mobile parity** includes complete action availability (not desktop-only controls)

### Step 11.6: UI/UX Upgrade Rules (All Pages)

- Use consistent page headers: title + subtitle + primary action zone
- Keep action hierarchy clear: one primary CTA, secondary actions as ghost/outline
- Use progressive disclosure for advanced filters/settings
- Minimize layout shift with skeletons matching final card/table dimensions
- Prefer inline validation over modal-only or toast-only validation messages
- Keep all key workflows ≤ 3 user steps where possible

### Step 11.7: Functional Coverage Matrix (Minimum)

| Area | Required Functional Completion |
|------|-------------------------------|
| Homepage | Search, category navigation, flash-deal countdown, add-to-cart from cards |
| Product Detail | Variant selection, quantity rules, add-to-cart/buy-now, tabbed info |
| Shop Pages | Filtering, sorting, pagination, URL sync, mobile filter sheet |
| Blog | Listing pagination (if needed), detail page rendering, related posts |
| Cart | Add/update/remove, subtotal/total calculation, empty state CTA |
| Search | Query parsing, result filtering, no-result recovery path |
| Auth | Login/register/reset with field validation + clear success/error responses |
| Account | User profile view + sign-out + guarded access |
| Legal/Static | Complete readable content with proper heading hierarchy |
| Seller Dashboard | Functional CRUD and workflows on every dashboard child page |

---

## 15. File Tree Reference

```
with-supabase-app/
├── app/
│   ├── globals.css                          # Updated: brand palette, no dark mode
│   ├── layout.tsx                           # Updated: Inter font, Header+Footer shell
│   ├── page.tsx                             # NEW: Homepage
│   ├── not-found.tsx                        # NEW: 404 page
│   ├── loading.tsx                          # NEW: Global loading skeleton
│   │
│   ├── (auth)/
│   │   ├── users/
│   │   │   ├── login/page.tsx              # NEW: Customer login
│   │   │   └── registration/page.tsx       # NEW: Customer registration
│   │   ├── seller/
│   │   │   └── login/page.tsx              # NEW: Seller login
│   │   └── password/
│   │       └── reset/page.tsx              # NEW: Password reset
│   │
│   ├── product/
│   │   └── [slug]/
│   │       ├── page.tsx                    # NEW: Product detail (server)
│   │       └── product-detail-client.tsx   # NEW: Product detail (client)
│   │
│   ├── shop/
│   │   ├── create/page.tsx                 # NEW: Become a seller
│   │   └── [shopSlug]/
│   │       ├── page.tsx                    # NEW: Shop landing
│   │       ├── top-selling/page.tsx        # NEW: Shop top selling
│   │       └── all-products/page.tsx       # NEW: Shop all products
│   │
│   ├── blog/
│   │   ├── page.tsx                        # NEW: Blog listing
│   │   └── [slug]/page.tsx                 # NEW: Blog post
│   │
│   ├── cart/page.tsx                       # NEW: Shopping cart
│   ├── brands/page.tsx                     # NEW: All brands
│   ├── categories/page.tsx                 # NEW: All categories
│   ├── flash-deals/page.tsx                # NEW: Flash deals
│   ├── search/page.tsx                     # NEW: Search results
│   ├── affiliate/page.tsx                  # NEW: Affiliate program
│   ├── track-your-order/page.tsx           # NEW: Order tracking
│   ├── account/page.tsx                    # NEW: User dashboard (protected)
│   ├── seller/
│   │   ├── login/page.tsx                  # NEW: Seller login
│   │   └── (dashboard)/
│   │       ├── layout.tsx                  # NEW: Seller dashboard shell
│   │       ├── dashboard/page.tsx          # NEW: Seller KPIs + overview
│   │       ├── products/page.tsx           # NEW: Product management
│   │       ├── orders/page.tsx             # NEW: Order management
│   │       ├── payments/page.tsx           # NEW: Payment ledger
│   │       ├── withdraw/page.tsx           # NEW: Withdraw requests
│   │       ├── commission/page.tsx         # NEW: Commission tracking
│   │       ├── conversations/page.tsx      # NEW: Messaging center
│   │       ├── support/page.tsx            # NEW: Support tickets
│   │       ├── storehouse/page.tsx         # NEW: Inventory management
│   │       ├── files/page.tsx              # NEW: Media/files manager
│   │       └── settings/page.tsx           # NEW: Store settings
│   │
│   └── (legal)/
│       ├── terms/page.tsx                  # NEW
│       ├── return-policy/page.tsx          # NEW
│       ├── support-policy/page.tsx         # NEW
│       └── privacy-policy/page.tsx         # NEW
│
├── components/
│   ├── header/
│   │   ├── index.tsx                       # NEW: Header composer
│   │   ├── top-bar.tsx                     # NEW
│   │   ├── main-header.tsx                 # NEW
│   │   ├── nav-bar.tsx                     # NEW
│   │   └── mobile-bottom-nav.tsx           # NEW
│   ├── footer.tsx                          # NEW
│   ├── product-card.tsx                    # NEW
│   ├── section-header.tsx                  # NEW
│   ├── category-card.tsx                   # NEW
│   ├── brand-card.tsx                      # NEW
│   ├── breadcrumb-nav.tsx                  # NEW
│   ├── quantity-selector.tsx               # NEW
│   └── ui/                                 # EXISTING + NEW shadcn components
│       ├── badge.tsx                       # EXISTING
│       ├── button.tsx                      # EXISTING
│       ├── card.tsx                        # EXISTING
│       ├── checkbox.tsx                    # EXISTING
│       ├── dropdown-menu.tsx               # EXISTING
│       ├── input.tsx                       # EXISTING
│       ├── label.tsx                       # EXISTING
│       ├── breadcrumb.tsx                  # NEW (shadcn add)
│       ├── carousel.tsx                    # NEW (shadcn add)
│       ├── navigation-menu.tsx             # NEW (shadcn add)
│       ├── pagination.tsx                  # NEW (shadcn add)
│       ├── radio-group.tsx                 # NEW (shadcn add)
│       ├── scroll-area.tsx                 # NEW (shadcn add)
│       ├── select.tsx                      # NEW (shadcn add)
│       ├── separator.tsx                   # NEW (shadcn add)
│       ├── sheet.tsx                       # NEW (shadcn add)
│       ├── skeleton.tsx                    # NEW (shadcn add)
│       ├── slider.tsx                      # NEW (shadcn add)
│       └── tabs.tsx                        # NEW (shadcn add)
│
├── lib/
│   ├── placeholder-data.ts                 # NEW: All mock data
│   ├── types.ts                            # NEW: TypeScript interfaces
│   ├── store.ts                            # NEW: Zustand stores (cart, wishlist)
│   ├── utils.ts                            # EXISTING: cn() helper
│   └── supabase/                           # EXISTING: Untouched
│       ├── client.ts
│       ├── server.ts
│       └── proxy.ts
│
├── proxy.ts                                # UPDATED: Public/protected path config
├── next.config.ts                          # UPDATED: Image remote patterns
├── tailwind.config.ts                      # EXISTING: Works as-is
├── components.json                         # EXISTING: shadcn config
├── package.json                            # UPDATED: New dependencies
└── tsconfig.json                           # EXISTING: Works as-is
```

**Total files: ~50 new/modified**

---

## 16. Component API Reference

Quick reference for all custom component props:

| Component | Props | Client? |
|-----------|-------|---------|
| `<Header />` | none | Mixed (MainHeader is client for Sheet) |
| `<TopBar />` | none | No (Server) |
| `<MainHeader />` | none | Yes (Sheet, stores) |
| `<NavBar />` | none | Yes (usePathname) |
| `<MobileBottomNav />` | none | Yes (usePathname, stores) |
| `<Footer />` | none | No (Server) |
| `<ProductCard />` | `product: Product`, `variant?: "default" \| "compact"` | Yes (stores) |
| `<SectionHeader />` | `title: string`, `badge?: string`, `viewAllHref?: string` | No |
| `<CategoryCard />` | `category: Category` | No |
| `<BrandCard />` | `brand: Brand` | No |
| `<BreadcrumbNav />` | `items: { label: string; href?: string }[]` | No |
| `<QuantitySelector />` | `value: number`, `onChange: (n) => void`, `min?`, `max?` | Yes |

---

## 17. Responsive Breakpoint Rules

All Tailwind breakpoints are **mobile-first** (min-width):

| Breakpoint | Tailwind Prefix | Width | Behavior |
|------------|----------------|-------|----------|
| Default (Mobile) | (none) | 0-639px | 1-2 columns, bottom nav visible, hamburger menu, stacked layouts |
| `sm` | `sm:` | 640px+ | 2-3 columns, slightly wider cards |
| `md` | `md:` | 768px+ | Bottom nav hidden, top bar visible, sidebar appears, 3-4 columns |
| `lg` | `lg:` | 1024px+ | Full sidebar, 4-5 columns, full header visible |
| `xl` | `xl:` | 1280px+ | Max container width reached, extra whitespace on sides |

**Critical Mobile Rules:**
1. `MobileBottomNav` → `md:hidden` (only shows below 768px)
2. `TopBar` → `hidden md:block` (only shows 768px+)
3. `NavBar` → `hidden md:block` (only shows 768px+)
4. Category sidebar (homepage hero) → `hidden md:block`
5. Shop filter sidebar → `hidden md:block` (Sheet on mobile)
6. Product detail → `flex-col md:flex-row` (stacked → side-by-side)
7. Footer grid → `grid-cols-1 md:grid-cols-2 lg:grid-cols-5`
8. Product grid → `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`

---

## 18. Performance Checklist

Run this checklist before shipping:

### Build
- [ ] `npm run build` completes with 0 errors
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No unused imports or variables
- [ ] All `<Image>` components have `width`/`height` or `fill` + `sizes`

### Lighthouse (target 90+ each)
- [ ] Performance: Minimize client JS, use Server Components
- [ ] Accessibility: All alt texts, ARIA labels, focus indicators
- [ ] Best Practices: HTTPS, no console errors
- [ ] SEO: All pages have `<title>` and `<meta description>`

### Mobile QA (375px viewport)
- [ ] Hamburger menu opens Sheet with full nav
- [ ] Bottom nav visible and tappable
- [ ] Product grids show 2 columns
- [ ] Product detail stacks vertically
- [ ] Cart page shows card layout (not table)
- [ ] All text readable (no overflow/clipping)
- [ ] Touch targets at least 44x44px

### Desktop QA (1440px viewport)
- [ ] 3-tier header fully visible
- [ ] Hero carousel with category sidebar
- [ ] Product grids show 4-5 columns
- [ ] Shop page sidebar visible
- [ ] Footer 5-column layout

### Functional QA
- [ ] Add to cart from any ProductCard → badge updates
- [ ] Cart page → quantity change → total recalculates
- [ ] Remove from cart → item disappears
- [ ] Wishlist toggle → heart fills/unfills
- [ ] Search → results filter correctly
- [ ] All nav links work (no 404s on defined routes)
- [ ] Carousel auto-plays and manual navigation works
- [ ] Mobile Sheet menu opens/closes properly

---

## Build Order Summary

Execute in this exact sequence for smoothest development:

```
Phase 0: npm install, shadcn add, delete old files, update config
Phase 1: lib/types.ts → lib/placeholder-data.ts → lib/store.ts
Phase 2: header/* → footer.tsx → layout.tsx
Phase 3: product-card.tsx → section-header.tsx → other shared components
Phase 4: app/page.tsx (Homepage)
Phase 5: app/product/[slug]/page.tsx (Product Detail)
Phase 6: app/shop/[shopSlug]/page.tsx (Shop Page)
Phase 7: app/blog/* (Blog)
Phase 8: Static pages (brands, categories, flash-deals, legal, 404)
Phase 9: Auth pages + account dashboard
Phase 10: Cart + Search
Phase 11: Seller dashboard (all child routes functional)
Final Pass: Loading states, SEO metadata, UX polish, QA
```

**Estimated Time:** 5-8 days for a senior developer working full-time (including full seller dashboard workflows and all-page functional completion).

---

> **This guide is the single source of truth for building the eSeller Store Bay clone.** Every file, every component, every design token is documented here. Follow the phases in order, test after each phase, and the final result will be a responsive, production-quality e-commerce frontend.
