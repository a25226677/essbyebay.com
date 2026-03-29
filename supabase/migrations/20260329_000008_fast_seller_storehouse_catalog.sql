-- Fast seller storehouse catalog fetch:
-- 1) Add root-catalog indexes for fast filtering/search/paging
-- 2) Add RPC with exact SQL-side totals and anti-join ownership filtering
-- 3) Backfill legacy source_product_id in safe unique-only mode

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_storehouse_roots_created_desc
  ON public.products (created_at DESC, id)
  WHERE is_active = true AND source_product_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_storehouse_roots_category_created_desc
  ON public.products (category_id, created_at DESC, id)
  WHERE is_active = true AND source_product_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_storehouse_roots_brand_created_desc
  ON public.products (brand_id, created_at DESC, id)
  WHERE is_active = true AND source_product_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_storehouse_roots_title_trgm
  ON public.products
  USING gin (LOWER(title) gin_trgm_ops)
  WHERE is_active = true AND source_product_id IS NULL;

CREATE OR REPLACE FUNCTION public.seller_get_storehouse_catalog_page(
  p_seller_id uuid,
  p_search text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  v_offset integer := (v_page - 1) * v_limit;
  v_search text := NULLIF(BTRIM(COALESCE(p_search, '')), '');
  v_items jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_base_total bigint := 0;
  v_pages integer := 1;
BEGIN
  WITH filtered_roots AS (
    SELECT
      src.id,
      src.title,
      src.sku,
      src.price,
      src.stock_count,
      src.image_url,
      src.created_at,
      c.name AS category_name,
      b.name AS brand_name
    FROM public.products src
    LEFT JOIN public.categories c ON c.id = src.category_id
    LEFT JOIN public.brands b ON b.id = src.brand_id
    WHERE src.is_active = true
      AND src.source_product_id IS NULL
      AND src.seller_id IS DISTINCT FROM p_seller_id
      AND (v_search IS NULL OR src.title ILIKE '%' || v_search || '%')
      AND (p_category_id IS NULL OR src.category_id = p_category_id)
      AND (p_brand_id IS NULL OR src.brand_id = p_brand_id)
  ),
  base_count AS (
    SELECT COUNT(*)::bigint AS total
    FROM filtered_roots
  ),
  visible_roots AS (
    SELECT fr.*
    FROM filtered_roots fr
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.products own
      WHERE own.seller_id = p_seller_id
        AND own.source_product_id = fr.id
    )
  ),
  visible_count AS (
    SELECT COUNT(*)::bigint AS total
    FROM visible_roots
  ),
  paged AS (
    SELECT *
    FROM visible_roots
    ORDER BY created_at DESC, id DESC
    OFFSET v_offset
    LIMIT v_limit
  ),
  item_json AS (
    SELECT
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'title', p.title,
            'sku', COALESCE(p.sku, ''),
            'price', COALESCE(p.price, 0),
            'stock', COALESCE(p.stock_count, 0),
            'image', p.image_url,
            'category', COALESCE(p.category_name, 'Uncategorized'),
            'brand', COALESCE(p.brand_name, '')
          )
          ORDER BY p.created_at DESC, p.id DESC
        ),
        '[]'::jsonb
      ) AS items
    FROM paged p
  )
  SELECT
    ij.items,
    vc.total,
    bc.total
  INTO v_items, v_total, v_base_total
  FROM item_json ij
  CROSS JOIN visible_count vc
  CROSS JOIN base_count bc;

  v_pages := CASE
    WHEN v_total > 0 THEN CEIL(v_total::numeric / v_limit)::integer
    ELSE 1
  END;

  RETURN jsonb_build_object(
    'items',
    COALESCE(v_items, '[]'::jsonb),
    'pagination',
    jsonb_build_object(
      'page', v_page,
      'limit', v_limit,
      'total', v_total,
      'pages', v_pages,
      'baseTotal', v_base_total,
      'remainingTotal', v_total,
      'hasMore', (v_offset + v_limit) < v_total,
      'exact', true
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seller_get_storehouse_catalog_page(uuid, text, uuid, uuid, integer, integer) TO authenticated;

-- Safe unique-only backfill:
-- - target only non-canonical rows in duplicate clusters (rank > 1)
-- - require exactly one candidate root from another seller
-- - skip ambiguous/unmatched rows and report counts
WITH ranked AS (
  SELECT
    p.id,
    p.seller_id,
    p.category_id,
    p.brand_id,
    p.source_product_id,
    LOWER(REGEXP_REPLACE(BTRIM(COALESCE(p.title, '')), '\s+', ' ', 'g')) AS normalized_title,
    ROW_NUMBER() OVER (
      PARTITION BY
        LOWER(REGEXP_REPLACE(BTRIM(COALESCE(p.title, '')), '\s+', ' ', 'g')),
        p.category_id,
        p.brand_id
      ORDER BY p.created_at ASC, p.id ASC
    ) AS rank_in_cluster
  FROM public.products p
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
   AND src.seller_id IS DISTINCT FROM t.seller_id
   AND src.id <> t.id
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
eligible_ranked AS (
  SELECT
    cc.target_id,
    t.seller_id,
    cc.chosen_source_id,
    ROW_NUMBER() OVER (
      PARTITION BY t.seller_id, cc.chosen_source_id
      ORDER BY cc.target_id
    ) AS seller_source_rank
  FROM candidate_counts cc
  JOIN targets t ON t.id = cc.target_id
  WHERE cc.candidate_count = 1
    AND cc.chosen_source_id IS NOT NULL
),
eligible AS (
  SELECT
    er.target_id,
    er.chosen_source_id
  FROM eligible_ranked er
  WHERE er.seller_source_rank = 1
    AND NOT EXISTS (
      SELECT 1
      FROM public.products existing
      WHERE existing.seller_id = er.seller_id
        AND existing.source_product_id = er.chosen_source_id
    )
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
  (SELECT COUNT(*)::integer FROM candidate_counts WHERE candidate_count = 0) AS unmatched_rows_skipped;
