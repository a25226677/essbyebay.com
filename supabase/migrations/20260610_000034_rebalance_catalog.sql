-- Rebalance catalog to 3-tier pricing ($20-$2,000).
-- Removes out-of-range products and exact SKU/title duplicates (keeps oldest).
-- Uses batched deletes of 200 rows to avoid upstream timeouts.

DO $$
DECLARE
  v_batch_size integer := 200;
  v_rows       integer := 1;
BEGIN

  -- 1. Remove order_items referencing out-of-range products (batched)
  LOOP
    DELETE FROM public.order_items
    WHERE ctid IN (
      SELECT oi.ctid
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE p.price < 20 OR p.price > 2000
      LIMIT v_batch_size
    );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;

  -- 2. Delete out-of-range products (batched)
  LOOP
    DELETE FROM public.products
    WHERE ctid IN (
      SELECT ctid FROM public.products
      WHERE price < 20 OR price > 2000
      LIMIT v_batch_size
    );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;

  -- 3. Remove exact SKU duplicates -- keep earliest per SKU (batched)
  LOOP
    DELETE FROM public.products
    WHERE ctid IN (
      SELECT ctid FROM (
        SELECT
          ctid,
          ROW_NUMBER() OVER (
            PARTITION BY sku
            ORDER BY created_at ASC, id ASC
          ) AS rn
        FROM public.products
        WHERE sku IS NOT NULL
      ) ranked
      WHERE rn > 1
      LIMIT v_batch_size
    );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;

  -- 4. Remove duplicate titles within same category -- keep earliest (batched)
  LOOP
    DELETE FROM public.products
    WHERE ctid IN (
      SELECT ctid FROM (
        SELECT
          ctid,
          ROW_NUMBER() OVER (
            PARTITION BY category_id, lower(title)
            ORDER BY created_at ASC, id ASC
          ) AS rn
        FROM public.products
        WHERE category_id IS NOT NULL
      ) ranked
      WHERE rn > 1
      LIMIT v_batch_size
    );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;

END;
$$;
