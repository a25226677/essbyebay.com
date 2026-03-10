-- ============================================================
-- Migration 000021 — Fix orphaned orders (no order_items)
--
-- Orders that were inserted directly into the database (e.g.
-- during development / demo seeding) may have no order_items
-- rows. This migration:
--
--   1. Re-syncs order_items.seller_id from products.seller_id
--      (belt-and-suspenders on top of migration 000019).
--
--   2. For orders that appear in froze_orders but have zero
--      order_items, inserts a single placeholder order_item
--      linked to the seller's cheapest active product. This
--      makes the order visible in the seller dashboard.
--
--   3. For orders that have NO items at all AND are NOT in
--      froze_orders, we cannot determine a seller, so they
--      are left as-is (visible only to admin).
-- ============================================================

-- Step 1: Re-sync seller_id on any mismatched order_items
UPDATE public.order_items oi
SET seller_id = p.seller_id
FROM public.products p
WHERE oi.product_id = p.id
  AND oi.seller_id IS DISTINCT FROM p.seller_id;

-- Step 2: Create placeholder order_items for orphaned orders
-- that have a seller link via froze_orders but zero items.
--
-- We pick the seller's cheapest active product as the placeholder.
-- The unit_price is set to the order's total_amount so the line
-- total is consistent (this is display-only data for the dashboard).
INSERT INTO public.order_items (
  order_id,
  product_id,
  seller_id,
  quantity,
  unit_price,
  line_total
)
SELECT DISTINCT ON (fo.order_id)
  fo.order_id,
  p.id            AS product_id,
  fo.seller_id,
  1               AS quantity,
  o.total_amount  AS unit_price,
  o.total_amount  AS line_total
FROM public.froze_orders fo
JOIN public.orders o ON o.id = fo.order_id
JOIN LATERAL (
  -- Pick any one active product belonging to this seller
  SELECT id
  FROM public.products
  WHERE seller_id = fo.seller_id
    AND is_active  = true
  ORDER BY price ASC
  LIMIT 1
) p ON true
WHERE
  -- Only for orders that currently have no items
  NOT EXISTS (
    SELECT 1
    FROM public.order_items oi
    WHERE oi.order_id = fo.order_id
  );
