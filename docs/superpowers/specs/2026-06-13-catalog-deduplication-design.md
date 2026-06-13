# Catalog Deduplication Design

**Date:** 2026-06-13  
**Status:** Approved  

## Problem

The eBay scraper inserts the same physical product multiple times because different eBay sellers list the same item with different item IDs. The scraper's `isDuplicate` check only matched by `sku` (eBay item ID), so each seller's listing was treated as a unique product.

Result: product grids show the same "La Roche-Posay Toleriane Double Repair Face Moisturizer" (or equivalent) 5–10 times with the same image and name, only minor price/variant differences.

## Duplicate Definition

Two catalog products are duplicates if `lower(title)` is identical (exact case-insensitive match).

- Applies to **catalog products only** (`seller_id IS NULL`) — scraped/inhouse products
- Seller-owned products (`seller_id IS NOT NULL`) are not constrained — they may intentionally share a name

## Approach

**Three-layer defense:**

1. **Scraper pre-check** — `isDuplicate` checks exact title before any images are downloaded or DB write is attempted. Fast, cheap, logs a clean `"duplicate"` status.
2. **DB unique constraint** — A partial unique index on `lower(title) WHERE seller_id IS NULL` enforces the rule at the database level. Catches any race condition or code path that bypasses the pre-check.
3. **Graceful fallback** — If `insertProduct` hits a Postgres `23505` unique-constraint error despite the pre-check, it returns `"duplicate"` instead of throwing, keeping stats accurate.

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/20260613_000035_deduplicate_catalog_by_title.sql` | New migration: (1) batch-delete existing title duplicates keeping oldest, (2) create partial unique index |
| `scripts/scraper/db-push.js` | `isDuplicate(supabase, sku, title)` — add exact title check; `insertProduct` catches `23505` and returns `"duplicate"` |
| `scripts/scraper/index.js` | Handle `"duplicate"` return from `insertProduct` in stats counting |

## Migration Detail

```sql
-- Step 1: Delete duplicate catalog products, keep oldest per title (batched, 200 rows)
DELETE FROM public.products
WHERE ctid IN (
  SELECT ctid FROM (
    SELECT ctid,
      ROW_NUMBER() OVER (
        PARTITION BY lower(title)
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM public.products
    WHERE seller_id IS NULL
  ) ranked
  WHERE rn > 1
  LIMIT 200
);
-- (loop until 0 rows affected)

-- Step 2: Add unique index to prevent future duplicates
CREATE UNIQUE INDEX idx_products_catalog_unique_title
  ON public.products (lower(title))
  WHERE seller_id IS NULL;
```

## Scraper `isDuplicate` Logic

```
1. Query: SELECT id FROM products WHERE sku = $sku           → duplicate if found
2. Query: SELECT id FROM products WHERE lower(title) = lower($title) AND seller_id IS NULL → duplicate if found
3. Return false (proceed to insert)
```

## Error Handling

`insertProduct` wraps the `.insert()` call. If Supabase returns a `23505` Postgres error (unique_violation), it returns the string `"duplicate"` instead of throwing. `processProduct` treats this as a duplicate in its stats, identical to a pre-check duplicate.

## Success Criteria

- After migration runs: zero duplicate titles in the catalog (`seller_id IS NULL`)
- After scraper runs: no new duplicates inserted regardless of how many eBay listings share a product name
- Scraper stats accurately report `duplicate` count (not `error`) for skipped duplicates
- Seller product creation is unaffected

## Out of Scope

- Cleaning up orphaned images in Supabase storage from deleted duplicate products
- Deduplicating seller-owned products
- Merging price/variant data from duplicate copies before deleting
