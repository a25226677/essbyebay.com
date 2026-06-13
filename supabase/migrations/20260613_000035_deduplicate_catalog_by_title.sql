-- Remove duplicate catalog products (seller_id IS NULL), keep the oldest per title.
-- Uses batched deletes of 200 rows to avoid statement timeouts.
-- Then adds a partial unique index to prevent future duplicates.

DO $$
DECLARE
  v_batch_size integer := 200;
  v_rows       integer := 1;
BEGIN

  LOOP
    DELETE FROM public.products
    WHERE ctid IN (
      SELECT ctid FROM (
        SELECT
          ctid,
          ROW_NUMBER() OVER (
            PARTITION BY lower(title)
            ORDER BY created_at ASC, id ASC
          ) AS rn
        FROM public.products
        WHERE seller_id IS NULL
      ) ranked
      WHERE rn > 1
      LIMIT v_batch_size
    );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;

END;
$$;

-- Prevent future duplicates: one catalog product per title (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_catalog_unique_title
  ON public.products (lower(title))
  WHERE seller_id IS NULL;
