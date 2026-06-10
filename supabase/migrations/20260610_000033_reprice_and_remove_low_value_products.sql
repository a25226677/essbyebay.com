-- Reprice products into a more premium $50-$2000 range.
-- Remove products currently priced under $20 and their restrictive order items first.

BEGIN;

-- 1. Remove order items tied to low-value products so the product rows can be deleted.
DELETE FROM public.order_items
WHERE product_id IN (
  SELECT id
  FROM public.products
  WHERE price < 20
);

-- 2. Delete products priced under $20.
DELETE FROM public.products
WHERE price < 20;

-- 3. Reprice the remaining catalog into a premium $50-$2000 range.
UPDATE public.products
SET
  price = ROUND((random() * (2000 - 50) + 50)::numeric, 2),
  compare_at_price = ROUND(
    ((random() * (2000 - 50) + 50)::numeric) * (1 + (random() * 0.35 + 0.15)),
    2
  );

COMMIT;
