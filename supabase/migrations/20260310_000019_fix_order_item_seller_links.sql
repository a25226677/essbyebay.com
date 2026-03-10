-- Fix historical order_items that were saved with wrong seller_id.
-- This ensures seller order dashboards and admin shop mapping are consistent.

UPDATE public.order_items oi
SET seller_id = p.seller_id
FROM public.products p
WHERE oi.product_id = p.id
  AND oi.seller_id IS DISTINCT FROM p.seller_id;
