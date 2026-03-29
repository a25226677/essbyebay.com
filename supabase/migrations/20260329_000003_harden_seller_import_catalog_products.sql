-- Harden seller bulk catalog import to avoid slug/SKU unique collisions on large imports.
CREATE OR REPLACE FUNCTION public.seller_import_catalog_products(
  p_seller_id uuid,
  p_shop_id uuid,
  p_search text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL
)
RETURNS TABLE(imported_count integer, skipped_count integer, total_matching integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_matching integer := 0;
  v_imported_count integer := 0;
BEGIN
  WITH catalog AS (
    SELECT DISTINCT ON (COALESCE(src.source_product_id, src.id))
      COALESCE(src.source_product_id, src.id) AS canonical_source_id,
      src.category_id,
      src.brand_id,
      src.title,
      src.sku,
      src.description,
      src.price,
      src.stock_count,
      src.image_url
    FROM public.products src
    WHERE src.is_active = true
      AND src.seller_id <> p_seller_id
      AND (NULLIF(BTRIM(COALESCE(p_search, '')), '') IS NULL OR src.title ILIKE '%' || BTRIM(p_search) || '%')
      AND (p_category_id IS NULL OR src.category_id = p_category_id)
      AND (p_brand_id IS NULL OR src.brand_id = p_brand_id)
    ORDER BY COALESCE(src.source_product_id, src.id), (src.source_product_id IS NULL) DESC, src.created_at ASC
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
      c.category_id,
      c.brand_id,
      c.title,
      CONCAT(
        LEFT(
          COALESCE(
            NULLIF(
              TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE(c.title, 'product')), '[^a-z0-9]+', '-', 'g')),
              ''
            ),
            'product'
          ),
          120
        ),
        '-',
        LOWER(REPLACE(p_seller_id::text, '-', '')),
        '-',
        LOWER(REPLACE(c.canonical_source_id::text, '-', ''))
      ),
      CASE
        WHEN NULLIF(BTRIM(COALESCE(c.sku, '')), '') IS NULL THEN NULL
        ELSE CONCAT(
          LEFT(BTRIM(c.sku), 40),
          '-',
          UPPER(REPLACE(p_seller_id::text, '-', '')),
          '-',
          UPPER(REPLACE(c.canonical_source_id::text, '-', ''))
        )
      END,
      c.description,
      c.price,
      COALESCE(c.stock_count, 1000),
      c.image_url,
      true,
      c.canonical_source_id
    FROM catalog c
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT
    (SELECT COUNT(*)::integer FROM catalog),
    (SELECT COUNT(*)::integer FROM inserted)
  INTO v_total_matching, v_imported_count;

  RETURN QUERY
  SELECT
    v_imported_count,
    GREATEST(v_total_matching - v_imported_count, 0),
    v_total_matching;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seller_import_catalog_products(uuid, uuid, text, uuid, uuid) TO authenticated;
