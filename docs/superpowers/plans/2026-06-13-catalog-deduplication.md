# Catalog Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all existing duplicate catalog products from the database and enforce a unique-title constraint so the scraper can never insert them again.

**Architecture:** Three-layer defense — (1) a SQL migration that cleans up existing duplicates and adds a DB-level partial unique index on `lower(title) WHERE seller_id IS NULL`; (2) the scraper's `isDuplicate` function updated to do an exact case-insensitive title check before inserting; (3) `insertProduct` catches Postgres error code `23505` (unique_violation) and returns `"duplicate"` instead of throwing, so stats stay accurate even if the pre-check is somehow bypassed.

**Tech Stack:** Node.js (CommonJS), Supabase JS SDK v2, PostgreSQL (via Supabase SQL Editor)

**Spec:** `docs/superpowers/specs/2026-06-13-catalog-deduplication-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260613_000035_deduplicate_catalog_by_title.sql` | **Create** | Batch-delete duplicate catalog products (keep oldest per title); add partial unique index |
| `scripts/scraper/db-push.js` | **Modify** | Fix `isDuplicate`: replace prefix check with exact title match; fix `insertProduct`: catch `23505` → return `"duplicate"` |
| `scripts/scraper/index.js` | **Modify** | Handle `"duplicate"` string returned by `insertProduct` in `processProduct` stats |

---

## Task 1: Create the cleanup + constraint migration

**Files:**
- Create: `supabase/migrations/20260613_000035_deduplicate_catalog_by_title.sql`

- [ ] **Step 1.1 — Write the migration file**

Create `supabase/migrations/20260613_000035_deduplicate_catalog_by_title.sql` with this exact content:

```sql
-- Remove duplicate catalog products (seller_id IS NULL), keep the oldest per title.
-- Uses batched deletes of 200 rows to avoid statement timeouts.
-- Then adds a partial unique index to prevent future duplicates.

DO $$
DECLARE
  v_batch_size integer := 200;
  v_rows       integer := 1;
BEGIN

  LOOP
    DELETE FROM public.products
    WHERE ctid IN (
      SELECT ctid FROM (
        SELECT
          ctid,
          ROW_NUMBER() OVER (
            PARTITION BY lower(title)
            ORDER BY created_at ASC, id ASC
          ) AS rn
        FROM public.products
        WHERE seller_id IS NULL
      ) ranked
      WHERE rn > 1
      LIMIT v_batch_size
    );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;

END;
$$;

-- Prevent future duplicates: one catalog product per title (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_catalog_unique_title
  ON public.products (lower(title))
  WHERE seller_id IS NULL;
```

- [ ] **Step 1.2 — Count duplicates BEFORE applying (run in Supabase SQL Editor)**

```sql
SELECT lower(title) AS norm_title, COUNT(*) AS copies
FROM public.products
WHERE seller_id IS NULL
GROUP BY lower(title)
HAVING COUNT(*) > 1
ORDER BY copies DESC
LIMIT 20;
```

Note the total count of rows that will be deleted — you'll verify zero after.

- [ ] **Step 1.3 — Apply the migration in Supabase SQL Editor**

Open your Supabase project → SQL Editor → paste the full migration content from Step 1.1 → Run.

Expected output: `DO` then `CREATE INDEX` — no errors.

- [ ] **Step 1.4 — Verify zero duplicates remain**

```sql
SELECT COUNT(*) AS remaining_duplicates
FROM (
  SELECT lower(title)
  FROM public.products
  WHERE seller_id IS NULL
  GROUP BY lower(title)
  HAVING COUNT(*) > 1
) sub;
```

Expected: `remaining_duplicates = 0`

- [ ] **Step 1.5 — Verify the unique index exists**

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'products'
  AND indexname = 'idx_products_catalog_unique_title';
```

Expected: one row with `indexdef` containing `WHERE (seller_id IS NULL)`.

- [ ] **Step 1.6 — Commit the migration file**

```bash
git add supabase/migrations/20260613_000035_deduplicate_catalog_by_title.sql
git commit -m "feat(db): remove catalog title duplicates and add unique index"
```

---

## Task 2: Update `isDuplicate` — exact title check

**Files:**
- Modify: `scripts/scraper/db-push.js:12-36`

- [ ] **Step 2.1 — Replace the prefix check with an exact title check**

In `scripts/scraper/db-push.js`, replace the entire `isDuplicate` function (lines 12–36) with:

```js
async function isDuplicate(supabase, sku, title) {
  // Check by SKU (eBay item ID)
  const { data: bySku, error: e1 } = await supabase
    .from("products")
    .select("id")
    .eq("sku", sku)
    .maybeSingle();
  if (e1) throw e1;
  if (bySku) return true;

  // Check by exact title (case-insensitive) — mirrors the DB unique index
  if (title && title.trim().length > 0) {
    const { data: byTitle, error: e2 } = await supabase
      .from("products")
      .select("id")
      .ilike("title", title.trim())
      .maybeSingle();
    if (e2) throw e2;
    if (byTitle) return true;
  }

  return false;
}
```

Key change: `.ilike("title", title.trim())` — no `.slice(0, 60)`, no `+ "%"` suffix. This is an exact case-insensitive match, consistent with the `lower(title)` unique index.

---

## Task 3: Update `insertProduct` — catch unique-constraint errors

**Files:**
- Modify: `scripts/scraper/db-push.js:77-85`

- [ ] **Step 3.1 — Wrap insertProduct to return `"duplicate"` on constraint violation**

In `scripts/scraper/db-push.js`, replace the `insertProduct` function (lines 77–85) with:

```js
async function insertProduct(supabase, product) {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select("id")
    .single();

  if (error) {
    // Postgres unique_violation — title already exists despite pre-check
    if (error.code === "23505") return "duplicate";
    throw error;
  }

  return data.id;
}
```

The return type is now `string (uuid) | "duplicate"`. Callers must handle the `"duplicate"` string.

---

## Task 4: Update `processProduct` — handle `"duplicate"` from `insertProduct`

**Files:**
- Modify: `scripts/scraper/index.js:54-59`

- [ ] **Step 4.1 — Guard insertProduct call against "duplicate" return**

In `scripts/scraper/index.js`, replace this block (lines 54–59):

```js
    const productId   = await insertProduct(supabase, productRow);
    const imageRows   = mapToDbImages(productId, imageUrls);
    const variantRows = buildVariantRows(productId, raw.variants, raw.stockCount);

    await insertProductImages(supabase, imageRows);
    await insertVariants(supabase, variantRows);

    console.log("    [OK] \"" + raw.title.slice(0, 50) + "\" $" + raw.price);
    return "inserted";
```

With:

```js
    const productId = await insertProduct(supabase, productRow);
    if (productId === "duplicate") {
      console.log("    [DUP] \"" + raw.title.slice(0, 50) + "\" (constraint)");
      return "duplicate";
    }

    const imageRows   = mapToDbImages(productId, imageUrls);
    const variantRows = buildVariantRows(productId, raw.variants, raw.stockCount);

    await insertProductImages(supabase, imageRows);
    await insertVariants(supabase, variantRows);

    console.log("    [OK] \"" + raw.title.slice(0, 50) + "\" $" + raw.price);
    return "inserted";
```

The `[DUP] (constraint)` log distinguishes a late-caught duplicate (hit the DB index) from a `[DUP]` caught by the pre-check (which logs nothing currently — it just returns `"duplicate"` at line 39).

- [ ] **Step 4.2 — Commit scraper changes**

```bash
git add scripts/scraper/db-push.js scripts/scraper/index.js
git commit -m "feat(scraper): enforce exact-title dedup with DB constraint fallback"
```

---

## Task 5: End-to-end smoke check

- [ ] **Step 5.1 — Verify the DB rejects a duplicate insert directly**

Run this in Supabase SQL Editor to confirm the index is active:

```sql
-- Insert a product with an existing catalog title (will fail)
INSERT INTO public.products (title, slug, price, stock_count, is_active)
VALUES (
  (SELECT title FROM public.products WHERE seller_id IS NULL LIMIT 1),
  'test-dup-slug-' || extract(epoch from now())::text,
  99.99,
  1,
  false
);
```

Expected: `ERROR: duplicate key value violates unique constraint "idx_products_catalog_unique_title"`

Roll back or delete if the insert somehow succeeded (it shouldn't).

- [ ] **Step 5.2 — Verify scraper dry-run reports duplicates, not errors**

```bash
node scripts/scraper/index.js --dry-run --category "Beauty" --tier low
```

Observe the console. The `Tier low done` summary line should show `dup:` increasing and `err:` staying low. No `[ERR]` lines should appear for products the scraper already knows about.

---

## Done

After Task 5 passes:
- The database has zero duplicate catalog titles
- The DB unique index enforces the rule permanently
- The scraper pre-checks and falls back to the DB constraint for any edge case
- Stats accurately report duplicates vs errors
