-- 1. Allow admin to create inhouse products without a seller shop.
--    seller_id and shop_id become optional; admin API auto-fills seller_id from session.

ALTER TABLE public.products
  ALTER COLUMN seller_id DROP NOT NULL,
  ALTER COLUMN shop_id   DROP NOT NULL;

-- 2. Fix storefront query timeout.
--    The homepage/search queries filter WHERE is_active = true ORDER BY created_at DESC.
--    Without a matching index PostgreSQL does a full table scan and hits the statement timeout.

CREATE INDEX IF NOT EXISTS idx_products_active_storefront
  ON public.products (created_at DESC, id)
  WHERE is_active = true;

-- Support category-filtered product sections on the homepage
CREATE INDEX IF NOT EXISTS idx_products_active_category_storefront
  ON public.products (category_id, created_at DESC, id)
  WHERE is_active = true;

-- Support brand pages
CREATE INDEX IF NOT EXISTS idx_products_active_brand_storefront
  ON public.products (brand_id, created_at DESC, id)
  WHERE is_active = true;

-- FK-side indexes so JOIN resolution (categories, brands) is fast
CREATE INDEX IF NOT EXISTS idx_products_category_id
  ON public.products (category_id);

CREATE INDEX IF NOT EXISTS idx_products_brand_id
  ON public.products (brand_id);

CREATE INDEX IF NOT EXISTS idx_products_shop_id
  ON public.products (shop_id)
  WHERE shop_id IS NOT NULL;

-- 3. Activate any products that are currently inactive so they appear in the storefront.
--    Comment out the line below to keep existing inactive products hidden.
UPDATE public.products SET is_active = true WHERE is_active = false;
