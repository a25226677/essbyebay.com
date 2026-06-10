-- Delete all inactive products and their related data.
-- order_items uses ON DELETE RESTRICT so it must be removed first.
-- All other child tables (reviews, cart_items, wishlist, product_variants, storehouse_items)
-- use ON DELETE CASCADE and are cleaned up automatically.

BEGIN;

-- 1. Remove order items linked to inactive products (restrict FK must go first)
DELETE FROM public.order_items
WHERE product_id IN (SELECT id FROM public.products WHERE is_active = false);

-- 2. Delete the inactive products — cascades to all remaining child rows
DELETE FROM public.products WHERE is_active = false;

COMMIT;
