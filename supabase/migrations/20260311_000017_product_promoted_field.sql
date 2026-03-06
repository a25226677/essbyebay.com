-- Add is_promoted column to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false;
