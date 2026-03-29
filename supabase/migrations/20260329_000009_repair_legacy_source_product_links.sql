-- Global safe repair for legacy source_product_id links.
-- Rules:
-- 1) Only update rows that currently have source_product_id IS NULL.
-- 2) Only update rows in duplicate title/category/brand clusters (rank > 1).
-- 3) Require exactly one candidate canonical root from another seller.
-- 4) Respect unique index (seller_id, source_product_id) by skipping existing/conflicting pairs.
-- 5) Idempotent: reruns only affect still-unmapped eligible rows.

WITH normalized AS (
  SELECT
    p.id,
    p.seller_id,
    p.category_id,
    p.brand_id,
    p.source_product_id,
    p.created_at,
    LOWER(REGEXP_REPLACE(BTRIM(COALESCE(p.title, '')), '\s+', ' ', 'g')) AS normalized_title
  FROM public.products p
),
ranked AS (
  SELECT
    n.*,
    ROW_NUMBER() OVER (
      PARTITION BY n.normalized_title, n.category_id, n.brand_id
      ORDER BY n.created_at ASC, n.id ASC
    ) AS rank_in_cluster
  FROM normalized n
),
targets AS (
  SELECT
    r.id,
    r.seller_id,
    r.category_id,
    r.brand_id,
    r.normalized_title
  FROM ranked r
  WHERE r.source_product_id IS NULL
    AND r.rank_in_cluster > 1
    AND NULLIF(r.normalized_title, '') IS NOT NULL
),
candidate_matches AS (
  SELECT
    t.id AS target_id,
    src.id AS source_id
  FROM targets t
  JOIN public.products src
    ON src.source_product_id IS NULL
   AND src.is_active = true
   AND src.id <> t.id
   AND src.seller_id IS DISTINCT FROM t.seller_id
   AND src.category_id IS NOT DISTINCT FROM t.category_id
   AND src.brand_id IS NOT DISTINCT FROM t.brand_id
   AND LOWER(REGEXP_REPLACE(BTRIM(COALESCE(src.title, '')), '\s+', ' ', 'g')) = t.normalized_title
),
candidate_counts AS (
  SELECT
    t.id AS target_id,
    COUNT(cm.source_id)::integer AS candidate_count,
    MIN(cm.source_id::text)::uuid AS chosen_source_id
  FROM targets t
  LEFT JOIN candidate_matches cm ON cm.target_id = t.id
  GROUP BY t.id
),
unique_candidates AS (
  SELECT
    cc.target_id,
    t.seller_id,
    cc.chosen_source_id
  FROM candidate_counts cc
  JOIN targets t ON t.id = cc.target_id
  WHERE cc.candidate_count = 1
    AND cc.chosen_source_id IS NOT NULL
),
without_existing_conflict AS (
  SELECT
    uc.target_id,
    uc.seller_id,
    uc.chosen_source_id
  FROM unique_candidates uc
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.products existing
    WHERE existing.seller_id = uc.seller_id
      AND existing.source_product_id = uc.chosen_source_id
  )
),
deduped AS (
  SELECT
    wec.target_id,
    wec.seller_id,
    wec.chosen_source_id,
    ROW_NUMBER() OVER (
      PARTITION BY wec.seller_id, wec.chosen_source_id
      ORDER BY wec.target_id
    ) AS seller_source_rank
  FROM without_existing_conflict wec
),
eligible AS (
  SELECT
    d.target_id,
    d.chosen_source_id
  FROM deduped d
  WHERE d.seller_source_rank = 1
),
updated_rows AS (
  UPDATE public.products p
  SET source_product_id = e.chosen_source_id
  FROM eligible e
  WHERE p.id = e.target_id
    AND p.source_product_id IS NULL
  RETURNING p.id
)
SELECT
  (SELECT COUNT(*)::integer FROM targets) AS targets_considered,
  (SELECT COUNT(*)::integer FROM updated_rows) AS rows_backfilled,
  (SELECT COUNT(*)::integer FROM candidate_counts WHERE candidate_count > 1) AS ambiguous_rows_skipped,
  (SELECT COUNT(*)::integer FROM candidate_counts WHERE candidate_count = 0) AS unmatched_rows_skipped,
  (
    SELECT COUNT(*)::integer
    FROM unique_candidates uc
    WHERE EXISTS (
      SELECT 1
      FROM public.products existing
      WHERE existing.seller_id = uc.seller_id
        AND existing.source_product_id = uc.chosen_source_id
    )
  ) AS existing_mapping_conflicts_skipped,
  (SELECT COUNT(*)::integer FROM deduped WHERE seller_source_rank > 1) AS duplicate_pair_conflicts_skipped;
