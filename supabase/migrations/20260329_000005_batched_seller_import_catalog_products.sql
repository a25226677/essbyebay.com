-- Batched seller catalog import to avoid statement timeout on large "Import All" runs.
-- This processes a small chunk per call, and the API can loop until has_more=false.

CREATE INDEX IF NOT EXISTS idx_products_active_roots_created_at
  ON public.products (created_at, id)
  WHERE is_active = true AND source_product_id IS NULL;

CREATE OR REPLACE FUNCTION public.seller_import_catalog_products_batch(
  p_seller_id uuid,
  p_shop_id uuid,
  p_search text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  imported_count integer,
  skipped_count integer,
  attempted_count integer,
  has_more boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500);
BEGIN
  RETURN QUERY
  WITH catalog AS (
    SELECT
      src.id AS canonical_source_id,
      src.category_id,
      src.brand_id,
      src.title,
      src.sku,
      src.description,
      src.price,
      src.stock_count,
      src.image_url,
      src.created_at
    FROM public.products src
    WHERE src.is_active = true
      AND src.source_product_id IS NULL
      AND src.seller_id <> p_seller_id
      AND (
        NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL
        OR src.title ILIKE '%' || BTRIM(p_search) || '%'
      )
      AND (p_category_id IS NULL OR src.category_id = p_category_id)
      AND (p_brand_id IS NULL OR src.brand_id = p_brand_id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.products own
        WHERE own.seller_id = p_seller_id
          AND own.source_product_id = src.id
      )
    ORDER BY src.created_at ASC, src.id ASC
    LIMIT v_limit + 1
  ),
  selected AS (
    SELECT *
    FROM catalog
    ORDER BY created_at ASC, canonical_source_id ASC
    LIMIT v_limit
  ),
  inserted AS (
    INSERT INTO public.products (
      seller_id,
      shop_id,
      category_id,
      brand_id,
      title,
      slug,
      sku,
      description,
      price,
      stock_count,
      image_url,
      is_active,
      source_product_id
    )
    SELECT
      p_seller_id,
      p_shop_id,
      s.category_id,
      s.brand_id,
      s.title,
      CONCAT(
        LEFT(
          COALESCE(
            NULLIF(
              TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE(s.title, 'product')), '[^a-z0-9]+', '-', 'g')),
              ''
            ),
            'product'
          ),
          120
        ),
        '-',
        LOWER(REPLACE(p_seller_id::text, '-', '')),
        '-',
        LOWER(REPLACE(s.canonical_source_id::text, '-', ''))
      ),
      CASE
        WHEN NULLIF(BTRIM(COALESCE(s.sku, '')), '') IS NULL THEN NULL
        ELSE CONCAT(
          LEFT(BTRIM(s.sku), 40),
          '-',
          UPPER(REPLACE(p_seller_id::text, '-', '')),
          '-',
          UPPER(REPLACE(s.canonical_source_id::text, '-', ''))
        )
      END,
      s.description,
      s.price,
      COALESCE(s.stock_count, 1000),
      s.image_url,
      true,
      s.canonical_source_id
    FROM selected s
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT
    (SELECT COUNT(*)::integer FROM inserted),
    GREATEST(
      (SELECT COUNT(*)::integer FROM selected) - (SELECT COUNT(*)::integer FROM inserted),
      0
    ),
    (SELECT COUNT(*)::integer FROM selected),
    (SELECT COUNT(*)::integer FROM catalog) > v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seller_import_catalog_products_batch(uuid, uuid, text, uuid, uuid, integer) TO authenticated;
