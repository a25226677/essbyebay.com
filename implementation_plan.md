# Implementation Plan

## Overview
Fix seller dashboard product visibility issue where new stores show no products in warehouse/storehouse view due to API filtering only inactive/out-of-stock items; update storehouse API to return all seller products with pagination/search, and align frontend to display as warehouse table matching products/ dashboard style.

The root cause is `/api/seller/storehouse/route.ts` query using `.or(\"is_active.eq.false,stock_count.eq.0\")` which excludes active/in-stock products (default for new ones). Products table uses `seller_id` correctly. Storehouse frontend currently shows catalog importer UI (fetching `/api/seller/catalog`); repurpose it to warehouse view fetching fixed `/api/seller/storehouse`, copying structure from `products/page.tsx` for consistency (table with pagination, search, actions). Products/ dashboard already works correctly. No DB schema changes or store verification blocking visibility.

High-level approach: (1) Fix/enhance storehouse API to match products/ (all products, paginated). (2) Replace storehouse frontend importer UI with warehouse table UI (reuse products/ logic). (3) Ensure consistent data shape.

## Types
Extend existing product types with warehouse-specific fields; reuse `ProductItem` from products/page.tsx.

New/Updated types in lib/types.ts (append):
```typescript
export type WarehouseProductItem = ProductItem & {  // Extend existing ProductItem
  index: number;
  sku?: string | null;
  reason?: string;  // For inactive/OOS: \"Inactive\" | \"Out of Stock\"
};
```
- `ProductItem` (existing): id, title, slug, price, stock_count, is_active, etc.
- Validation: stock_count >=0 number, price >0 number, title non-empty string.
- Relationships: products[seller_id] → profiles[id], products[shop_id] → shops[id].

No new enums/interfaces needed.

## Files
Modify 3 existing files; no new files or deletions.

- `app/api/seller/storehouse/route.ts`: Replace buggy query with paginated all-products query matching products/route.ts; add search/page/limit.
- `app/seller/(dashboard)/storehouse/page.tsx`: Replace catalog importer UI with warehouse table (copy + adapt from products/page.tsx); fetch /api/seller/storehouse; handle WarehouseProductItem.
- `lib/types.ts`: Append WarehouseProductItem type (minor).

No config changes (Next.js/Supabase unchanged).

## Functions
Modify 1 API function; frontend uses no custom functions (hooks/effects).

- Modified: `GET` handler in `app/api/seller/storehouse/route.ts`
  - Current: supabase.from(\"products\").eq(\"seller_id\", userId).or(\"is_active.eq.false,stock_count.eq.0\")
  - Changes: Add URLSearchParams for page/limit/search; .ilike(\"title\", `%${search}%`); .order(\"is_active\", {ascending: false}).order(\"created_at\", {desc: false}); .range(from, to); return {items, total: count, page, limit}.
  - Signature unchanged (async function GET(request?: Request)).

Frontend: Reuse fetch logic/effects from products/page.tsx (no new functions).

## Classes
No class modifications (functional components, no classes).

## Dependencies
No new dependencies or version changes (uses existing Supabase, Lucide React, shadcn/ui).

## Testing
Manual browser testing (no unit tests needed):
1. Seller login → storehouse/ → expect empty initially.
2. Add product via products/new → refresh storehouse → visible.
3. Test search/pagination; toggle active/stock → still visible (no filter).
4. Compare with products/ dashboard consistency.

## Implementation Order
1. Update `lib/types.ts` with WarehouseProductItem.
2. Fix `app/api/seller/storehouse/route.ts` backend (independent).
3. Replace `app/seller/(dashboard)/storehouse/page.tsx` frontend.
4. Test via dev server.

