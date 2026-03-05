-- Add product storehouse fields: Today's Deal, Featured, and Sale Count
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS today_deal  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_count  integer NOT NULL DEFAULT 0;
