-- Add 'cancelled' to delivery_status check constraint
-- PostgreSQL requires dropping and recreating the constraint

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_delivery_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_status_check
  CHECK (delivery_status IN ('pending', 'confirmed', 'picked_up', 'on_the_way', 'delivered', 'cancelled'));
