-- Cap the catalog at 8,000 products, keep the best products per category,
-- and normalize prices into the 45/35/20 tier distribution.

BEGIN;

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

DELETE FROM public.order_items
WHERE product_id IN (
  SELECT p.id
  FROM public.products p
  LEFT JOIN tmp_keepers k ON k.id = p.id
  WHERE p.category_id IS NULL
     OR k.id IS NULL
);

DELETE FROM public.products p
WHERE p.category_id IS NULL
   OR NOT EXISTS (
     SELECT 1
     FROM tmp_keepers k
     WHERE k.id = p.id
   );

UPDATE public.products p
SET
  price = ROUND(
    CASE k.tier
      WHEN 'low' THEN (random() * (200 - 20) + 20)::numeric
      WHEN 'mid' THEN (random() * (800 - 200) + 200)::numeric
      ELSE (random() * (2000 - 800) + 800)::numeric
    END,
    2
  )
FROM tmp_keepers k
WHERE k.id = p.id;

UPDATE public.products p
SET
  compare_at_price = ROUND(
    LEAST(
      2000::numeric,
      p.price * (1 + (random() * 0.35 + 0.15))
    ),
    2
  )
FROM tmp_keepers k
WHERE k.id = p.id;

COMMIT;
