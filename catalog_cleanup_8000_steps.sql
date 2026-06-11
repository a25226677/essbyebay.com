-- ============================================================
-- STEP A -- Run ONCE: build the keepers table
-- ============================================================
DROP TABLE IF EXISTS _catalog_keepers;
CREATE TABLE _catalog_keepers AS
WITH category_base AS (
  SELECT
    c.id AS category_id,
    row_number() OVER (ORDER BY c.name, c.id) AS rk,
    count(*) OVER () AS total
  FROM public.categories c
),
targets AS (
  SELECT
    category_id,
    (8000 / total) + CASE WHEN rk <= (8000 % total) THEN 1 ELSE 0 END AS cat_target,
    floor(((8000 / total) + CASE WHEN rk <= (8000 % total) THEN 1 ELSE 0 END) * 0.45)::int AS low_n,
    floor(((8000 / total) + CASE WHEN rk <= (8000 % total) THEN 1 ELSE 0 END) * 0.35)::int AS mid_n
  FROM category_base
),
ranked AS (
  SELECT
    p.id,
    t.low_n,
    t.mid_n,
    t.cat_target,
    row_number() OVER (
      PARTITION BY p.category_id
      ORDER BY p.is_active DESC, p.rating DESC, p.review_count DESC,
               p.stock_count DESC, p.created_at DESC, p.id ASC
    ) AS rn
  FROM public.products p
  JOIN targets t ON t.category_id = p.category_id
  WHERE p.category_id IS NOT NULL
)
SELECT
  id,
  CASE
    WHEN rn <= low_n THEN 'low'
    WHEN rn <= low_n + mid_n THEN 'mid'
    ELSE 'high'
  END AS tier
FROM ranked
WHERE rn <= cat_target;

CREATE INDEX ON _catalog_keepers (id);


-- ============================================================
-- STEP B -- Repeat until 0 rows: delete orphan order_items
-- ============================================================
DELETE FROM public.order_items
WHERE ctid IN (
  SELECT oi.ctid
  FROM public.order_items oi
  LEFT JOIN _catalog_keepers k ON k.id = oi.product_id
  WHERE k.id IS NULL
  LIMIT 500
);


-- ============================================================
-- STEP C -- Repeat until 0 rows: delete non-keeper products
-- ============================================================
DELETE FROM public.products
WHERE ctid IN (
  SELECT p.ctid
  FROM public.products p
  LEFT JOIN _catalog_keepers k ON k.id = p.id
  WHERE k.id IS NULL OR p.category_id IS NULL
  LIMIT 500
);


-- ============================================================
-- STEP D -- Run ONCE: set price + compare_at_price atomically
-- price is computed once; compare_at_price = price * 1.15-1.35
-- so compare_at_price is always >= price (satisfies check constraint)
-- ============================================================
UPDATE public.products p
SET
  price             = sub.new_price,
  compare_at_price  = ROUND(LEAST(2000::numeric, (sub.new_price * (1 + (random() * 0.35 + 0.15)::numeric))::numeric), 2)
FROM (
  SELECT
    k.id,
    ROUND(
      CASE k.tier
        WHEN 'low'  THEN (random() * 180 + 20)::numeric
        WHEN 'mid'  THEN (random() * 600 + 200)::numeric
        ELSE             (random() * 1200 + 800)::numeric
      END, 2
    ) AS new_price
  FROM _catalog_keepers k
) sub
WHERE p.id = sub.id;


-- ============================================================
-- STEP E -- Run ONCE: cleanup helper table
-- ============================================================
DROP TABLE IF EXISTS _catalog_keepers;
