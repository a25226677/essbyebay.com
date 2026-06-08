# Homepage Redesign — Design Spec
**Date:** 2026-06-09  
**Status:** Approved  

---

## Overview

Redesign the storefront homepage to look and feel like a professional Amazon-style e-commerce store. Keep the current Navy + Orange brand palette (`#2f3b51` / `#f77f00`). Add three new sections, improve eight existing files, and ensure full responsiveness across mobile, tablet, and desktop.

---

## Design Direction

- **Style:** Amazon-dense (information-rich, product-forward)
- **Color palette:** Keep existing — Navy (`#2f3b51`, `#1b233a`), Orange (`#f77f00`), white product surfaces
- **Breakpoints:** Mobile `< 640px`, Tablet `640–1024px`, Desktop `> 1024px`

---

## Section Architecture (top → bottom)

| # | Section | Status | Component |
|---|---------|--------|-----------|
| 1 | Header | Unchanged | `components/header/main-header.tsx` |
| 2 | Trust Bar | **NEW** | `components/home/trust-bar.tsx` |
| 3 | Subnav | Minor polish | `components/header/nav-bar.tsx` |
| 4 | Hero + Category Sidebar | Improved | `components/home/hero-section.tsx` |
| 5 | Deal of the Day | **NEW** | `components/home/deal-of-the-day.tsx` |
| 6 | Flash Deals (with timer) | Improved | `components/home/flash-deals-row.tsx` |
| 7 | Promo Banners | Improved | `components/home/promo-banners.tsx` |
| 8 | New Arrivals | Improved | `components/home/new-products-grid.tsx` |
| 9 | Per-Category Sections | Minor polish | `app/page.tsx` inline |
| 10 | Browse Categories | Minor polish | `app/page.tsx` inline |
| 11 | Brand Strip | Improved | `components/home/top-brands-row.tsx` |
| 12 | Newsletter Strip | **NEW** | `components/home/newsletter-strip.tsx` |
| 13 | Footer | Unchanged | `components/footer.tsx` |

---

## Component Specs

### ② Trust Bar — `components/home/trust-bar.tsx` (NEW)

A thin dark bar (`bg-[#1b233a]`) placed directly below the header.

**4 trust items (desktop: all in one row, mobile: 2×2 grid):**
- 🚚 Free Shipping on $50+
- ↩ 30-Day Easy Returns
- 🔒 Secure Payment
- 💬 24/7 Customer Support

Each item: icon dot (colored) + label text in small caps. Separated by `|` dividers on desktop, none on mobile.

**Responsive:**
- Desktop: `flex flex-row justify-center` with dividers between items
- Mobile: `grid grid-cols-2` with no dividers, smaller text

---

### ④ Hero Section — `components/home/hero-section.tsx` (IMPROVED)

Add an Amazon-style **category sidebar** on the left side of the hero on large screens.

**Category sidebar (desktop/large only — `hidden lg:block`):**
- Width: `w-[180px]` fixed
- White background, border-right
- List all categories from props — each item: colored dot + category name
- Active/hovered item: orange left border + orange text + `bg-[#fff8f0]`
- Clicking navigates to `/search?q={category.name}`

**Banner carousel (existing, unchanged logic):**
- Takes remaining flex space on desktop
- Full width on mobile (sidebar hidden)

**Responsive:**
- `lg:` — sidebar visible, carousel fills remaining space
- `< lg` — sidebar hidden, carousel full width (existing mobile behavior kept)

---

### ⑤ Deal of the Day — `components/home/deal-of-the-day.tsx` (NEW)

Full-width dark banner (`bg-gradient-to-r from-[#1b233a] to-[#2a3550]`) featuring one promoted flash deal product.

**Layout (flex row desktop, flex col mobile):**
- **Left:** "⭐ DEAL OF THE DAY" eyebrow label (orange), product title, original price struck through + sale price
- **Center:** Animated live countdown timer (hours : minutes : seconds) using `useEffect` + `setInterval`
- **Right:** "Grab This Deal →" CTA button linking to `/product/{slug}`

**Timer blocks:** Each unit (HH, MM, SS) in a dark box with white bold number + small label underneath.

**Data source:** Takes the first flash deal from the `flashDeals` prop passed down from `app/page.tsx`. Renders `null` if `flashDeals` is empty.

**Responsive:**
- Desktop: three-column `flex flex-row` layout
- Mobile: stacked, timer centered, CTA full-width

---

### ⑥ Flash Deals Row — `components/home/flash-deals-row.tsx` (IMPROVED)

**Section header changes:**
- Add orange left-bar `div` before title (3px wide, 18px tall, `bg-[#f77f00] rounded`)
- Title: `uppercase font-extrabold text-[#1b233a]`
- Badge: `bg-[#e53e3e]` "HOT" pill
- Add a second countdown timer in the header right side (same live timer logic, smaller boxes)

**Product cards:** Now use the improved `ProductCard` component (see below).

---

### ⑦ Promo Banners — `components/home/promo-banners.tsx` (IMPROVED)

- CTA button: change from `bg-white text-gray-900` to a more intentional hover — add `shadow` and `ring` on hover
- Full-width banner: strengthen gradient overlay for better text contrast
- Round corners: use `rounded-lg` instead of `rounded`
- No structural changes

---

### ⑧ New Products Grid — `components/home/new-products-grid.tsx` (IMPROVED)

- Section header: use same new orange-left-bar style
- Product cards: pass `showNewBadge={true}` to `ProductCard` to show an orange "New" badge

---

### ⑪ Brand Strip — `components/home/top-brands-row.tsx` (IMPROVED)

- Section header: orange-left-bar style
- Brand logo cards: consistent height `h-[64px]`, subtle `border border-gray-100 shadow-sm`, `hover:shadow-md` transition

---

### ⑫ Newsletter Strip — `components/home/newsletter-strip.tsx` (NEW)

Full-width orange gradient strip (`bg-gradient-to-r from-[#f77f00] to-[#e67300]`) placed between the brand strip and the footer.

**Content:**
- Left: "📧 Get Exclusive Deals in Your Inbox" (bold white) + "Join 50,000+ subscribers · Unsubscribe anytime" (muted white)
- Right: email `<input>` + "Subscribe Now" `<button>` (dark navy bg)

**State:** local `useState` for email value. `onSubmit` logs email (no real API call — placeholder).

**Responsive:**
- Desktop: side-by-side `flex flex-row items-center justify-between`
- Mobile: stacked `flex flex-col gap-4`, input full-width

---

### Product Card — `components/product-card.tsx` (IMPROVED)

Upgrade the card design across the entire site:

1. **Star ratings row:** Add `★★★★☆` display + `(N reviews)` count. Use `product.rating` and `product.reviewCount` if available, otherwise show placeholder `★★★★☆`.
2. **Strikethrough original price:** Already exists — just ensure it shows consistently.
3. **"Add to Cart" button:** Change from hover-only to **always visible** on desktop. On mobile always visible. Remove the CSS opacity/translate hack — use a standard block button at the bottom of the card body.
4. **Badges:** Discount badge (red) stays when `originalPrice` present. Accept a new optional `showNewBadge?: boolean` prop — when `true`, renders an orange "New" badge in the same top-left position (only shown when no discount badge applies).
5. **Card border:** `hover:border-[#f77f00]/40` on hover for a subtle orange glow.

---

### Section Header — `components/section-header.tsx` (IMPROVED)

Add the orange left-bar design:

```
|  SECTION TITLE  [BADGE]         View all →
```

- Left bar: `w-[3px] h-[18px] bg-[#f77f00] rounded-sm`
- Title: `text-[14px] font-extrabold text-[#1b233a] uppercase tracking-wide`
- Badge: unchanged (`bg-[#e53e3e]`)
- View all: unchanged

---

### `app/page.tsx` (UPDATED)

Import and place new components in order:

```tsx
<TrustBar />                                     // new — homepage only
<HeroSection ... />                              // existing + category sidebar
<DealOfTheDay flashDeals={flashDeals} />         // new
<PromoBanners />                                 // existing improved
<section className="store-page-container store-section">
  <FlashDealsRow flashDeals={flashDeals} />      // existing improved
</section>
<section className="store-page-container store-section">
  <NewProductsGrid products={...} />             // existing improved
</section>
{/* per-category sections — unchanged */}
<section className="bg-white border-t border-gray-100">
  <TopBrandsRow brands={brands} />               // existing improved
</section>
<NewsletterStrip />                              // new
```

`TrustBar` is placed at the top of `app/page.tsx` (homepage only), not in `layout.tsx`, so it does not appear on cart, checkout, blog, or account pages.

---

## Responsiveness Contract

| Breakpoint | Key behaviors |
|------------|--------------|
| `< 640px` (mobile) | Trust bar: 2-col grid. Hero sidebar: hidden. Deal of Day: stacked. Cards: 2-col grid. Newsletter: stacked. |
| `640–1024px` (tablet) | Trust bar: row. Hero sidebar: hidden. Cards: 3–4 col. |
| `> 1024px` (desktop) | Full layout as shown in mockup. Hero sidebar visible. |

---

## What Is NOT Changing

- Header (`main-header.tsx`) — no changes
- Footer (`footer.tsx`) — no changes
- Cart, wishlist, auth flows — no changes
- Admin / seller dashboards — not affected
- All data fetching logic in `lib/storefront-data.ts` — unchanged
- URL structure, routing — unchanged
