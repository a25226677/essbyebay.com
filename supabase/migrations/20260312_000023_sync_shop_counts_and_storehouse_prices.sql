-- ============================================================
-- Migration 000023 — Sync shop counts, canonicalize catalog imports,
--                    and keep seller storehouse pricing consistent.
-- ============================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_source_product_id
  ON public.products(source_product_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_seller_source_unique
  ON public.products(seller_id, source_product_id)
  WHERE source_product_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refresh_shop_product_count(p_shop_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_shop_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.shops s
  SET product_count = (
    SELECT COUNT(*)::integer
    FROM public.products p
    WHERE p.shop_id = p_shop_id
  )
  WHERE s.id = p_shop_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_shop_product_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_shop_product_count(OLD.shop_id);
    RETURN OLD;
  END IF;

  PERFORM public.refresh_shop_product_count(NEW.shop_id);

  IF TG_OP = 'UPDATE' AND OLD.shop_id IS DISTINCT FROM NEW.shop_id THEN
    PERFORM public.refresh_shop_product_count(OLD.shop_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_sync_shop_product_count ON public.products;
CREATE TRIGGER trg_products_sync_shop_product_count
  AFTER INSERT OR UPDATE OF shop_id OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_shop_product_count();

UPDATE public.shops s
SET product_count = counts.product_count
FROM (
  SELECT shop_id, COUNT(*)::integer AS product_count
  FROM public.products
  GROUP BY shop_id
) counts
WHERE s.id = counts.shop_id;

UPDATE public.shops
SET product_count = 0
WHERE id NOT IN (
  SELECT DISTINCT shop_id
  FROM public.products
  WHERE shop_id IS NOT NULL
);

CREATE OR REPLACE FUNCTION public.sync_order_item_seller_and_storehouse_price()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_seller_id uuid;
BEGIN
  SELECT p.seller_id
  INTO v_product_seller_id
  FROM public.products p
  WHERE p.id = NEW.product_id;

  IF v_product_seller_id IS NOT NULL THEN
    NEW.seller_id := v_product_seller_id;
  END IF;

  IF COALESCE(NEW.storehouse_price, 0) <= 0 THEN
    NEW.storehouse_price := ROUND(COALESCE(NEW.unit_price, 0) * 0.70, 2);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_sync_seller_and_storehouse_price ON public.order_items;
CREATE TRIGGER trg_order_items_sync_seller_and_storehouse_price
  BEFORE INSERT OR UPDATE OF product_id, unit_price, storehouse_price ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_item_seller_and_storehouse_price();

UPDATE public.order_items oi
SET seller_id = p.seller_id,
    storehouse_price = CASE
      WHEN COALESCE(oi.storehouse_price, 0) > 0 THEN oi.storehouse_price
      ELSE ROUND(COALESCE(oi.unit_price, 0) * 0.70, 2)
    END
FROM public.products p
WHERE p.id = oi.product_id
  AND (
    oi.seller_id IS DISTINCT FROM p.seller_id
    OR COALESCE(oi.storehouse_price, 0) <= 0
  );

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
  v_seller_suffix text := UPPER(SUBSTRING(REPLACE(p_seller_id::text, '-', '') FROM 1 FOR 6));
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
      TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE(c.title, 'product')), '[^a-z0-9]+', '-', 'g'))
        || '-' || LOWER(SUBSTRING(REPLACE(c.canonical_source_id::text, '-', '') FROM 1 FOR 8))
        || '-' || LOWER(SUBSTRING(REPLACE(p_seller_id::text, '-', '') FROM 1 FOR 6)),
      CASE
        WHEN NULLIF(BTRIM(COALESCE(c.sku, '')), '') IS NULL THEN NULL
        ELSE BTRIM(c.sku) || '-' || v_seller_suffix || '-' || UPPER(SUBSTRING(REPLACE(c.canonical_source_id::text, '-', '') FROM 1 FOR 6))
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