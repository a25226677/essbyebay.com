-- Cap the catalog at 8,000 products, keep the strongest products per category,
-- and rebalance prices into the 45/35/20 tier distribution.
--
-- This version uses explicit batch tables instead of data-modifying CTEs so it
-- is more stable in Supabase's SQL editor.

DO $$
DECLARE
  v_batch_size integer := 200;
  v_rows integer := 1;
  v_category_count integer;
BEGIN
  SELECT count(*)
  INTO v_category_count
  FROM public.categories;

  IF v_category_count = 0 THEN
    RAISE EXCEPTION 'Cannot rebalance catalog: public.categories is empty.';
  END IF;

  CREATE TEMP TABLE tmp_category_targets ON COMMIT DROP AS
  WITH category_base AS (
    SELECT
      c.id AS category_id,
      row_number() OVER (ORDER BY c.name, c.id) AS category_rank,
      count(*) OVER () AS category_count
    FROM public.categories c
  )
  SELECT
    cb.category_id,
    (8000 / cb.category_count)
      + CASE WHEN cb.category_rank <= (8000 % cb.category_count) THEN 1 ELSE 0 END AS category_target,
    floor((
      (8000 / cb.category_count)
        + CASE WHEN cb.category_rank <= (8000 % cb.category_count) THEN 1 ELSE 0 END
    ) * 0.45)::int AS low_target,
    floor((
      (8000 / cb.category_count)
        + CASE WHEN cb.category_rank <= (8000 % cb.category_count) THEN 1 ELSE 0 END
    ) * 0.35)::int AS mid_target
  FROM category_base cb;

  CREATE TEMP TABLE tmp_keepers ON COMMIT DROP AS
  WITH ranked AS (
    SELECT
      p.id,
      p.category_id,
      t.category_target,
      t.low_target,
      t.mid_target,
      row_number() OVER (
        PARTITION BY p.category_id
        ORDER BY
          p.is_active DESC,
          p.rating DESC,
          p.review_count DESC,
          p.stock_count DESC,
          p.created_at DESC,
          p.id ASC
      ) AS rn
    FROM public.products p
    JOIN tmp_category_targets t
      ON t.category_id = p.category_id
    WHERE p.category_id IS NOT NULL
  )
  SELECT
    id,
    category_id,
    category_target,
    low_target,
    mid_target,
    CASE
      WHEN rn <= low_target THEN 'low'
      WHEN rn <= low_target + mid_target THEN 'mid'
      ELSE 'high'
    END AS tier
  FROM ranked
  WHERE rn <= category_target;

  CREATE INDEX ON tmp_keepers (id);

  CREATE TEMP TABLE tmp_price_targets ON COMMIT DROP AS
  SELECT id, tier
  FROM tmp_keepers;

  CREATE INDEX ON tmp_price_targets (id);

  CREATE TEMP TABLE tmp_order_item_ctids (
    row_tid tid PRIMARY KEY
  ) ON COMMIT DROP;

  CREATE TEMP TABLE tmp_product_ctids (
    row_tid tid PRIMARY KEY
  ) ON COMMIT DROP;

  CREATE TEMP TABLE tmp_price_batch (
    id uuid PRIMARY KEY,
    tier text NOT NULL
  ) ON COMMIT DROP;

  LOOP
    TRUNCATE tmp_order_item_ctids;

    INSERT INTO tmp_order_item_ctids (row_tid)
    SELECT oi2.ctid
    FROM public.order_items oi2
    LEFT JOIN tmp_keepers k ON k.id = oi2.product_id
    LEFT JOIN public.products p ON p.id = oi2.product_id
    WHERE oi2.product_id IS NOT NULL
      AND (
        p.category_id IS NULL
        OR k.id IS NULL
      )
    LIMIT v_batch_size;

    DELETE FROM public.order_items oi
    USING tmp_order_item_ctids doomed
    WHERE oi.ctid = doomed.row_tid;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;

  LOOP
    TRUNCATE tmp_product_ctids;

    INSERT INTO tmp_product_ctids (row_tid)
    SELECT p2.ctid
    FROM public.products p2
    LEFT JOIN tmp_keepers k ON k.id = p2.id
    WHERE p2.category_id IS NULL
       OR k.id IS NULL
    LIMIT v_batch_size;

    DELETE FROM public.products p
    USING tmp_product_ctids doomed
    WHERE p.ctid = doomed.row_tid;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;

  LOOP
    TRUNCATE tmp_price_batch;

    INSERT INTO tmp_price_batch (id, tier)
    SELECT id, tier
    FROM tmp_price_targets
    ORDER BY id
    LIMIT v_batch_size;

    UPDATE public.products p
    SET price = ROUND(
      CASE batch.tier
        WHEN 'low' THEN (random() * (200 - 20) + 20)::numeric
        WHEN 'mid' THEN (random() * (800 - 200) + 200)::numeric
        ELSE (random() * (2000 - 800) + 800)::numeric
      END,
      2
    )
    FROM tmp_price_batch batch
    WHERE p.id = batch.id;

    DELETE FROM tmp_price_targets t
    USING tmp_price_batch batch
    WHERE t.id = batch.id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;

  INSERT INTO tmp_price_targets (id, tier)
  SELECT id, tier
  FROM tmp_keepers;

  LOOP
    TRUNCATE tmp_price_batch;

    INSERT INTO tmp_price_batch (id, tier)
    SELECT id, tier
    FROM tmp_price_targets
    ORDER BY id
    LIMIT v_batch_size;

    UPDATE public.products p
    SET compare_at_price = ROUND(
      LEAST(
        2000::numeric,
        p.price * (1 + (random() * 0.35 + 0.15))
      ),
      2
    )
    FROM tmp_price_batch batch
    WHERE p.id = batch.id;

    DELETE FROM tmp_price_targets t
    USING tmp_price_batch batch
    WHERE t.id = batch.id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    EXIT WHEN v_rows = 0;
  END LOOP;
END;
$$;
