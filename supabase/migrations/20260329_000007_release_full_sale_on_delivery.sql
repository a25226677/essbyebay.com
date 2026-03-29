-- Release full seller sale amount (amount + profit) from pending to wallet
-- when orders are delivered. Keep logic in DB trigger so all update paths are
-- consistent, then backfill historical delivered rows and rebuild balances.

CREATE OR REPLACE FUNCTION public.release_seller_pending_on_order_delivery(
  p_order_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_released_rows integer := 0;
BEGIN
  WITH releasable_rows AS (
    SELECT
      fo.id,
      fo.seller_id,
      GREATEST(0, ROUND(COALESCE(fo.amount, 0) + COALESCE(fo.profit, 0), 2)) AS release_amount
    FROM public.froze_orders fo
    WHERE fo.order_id = p_order_id
      AND LOWER(COALESCE(fo.payment_status, '')) = 'paid'
      AND LOWER(COALESCE(fo.pickup_status, '')) <> 'picked_up'
  ),
  releasable_sellers AS (
    SELECT
      rr.seller_id,
      ROUND(SUM(rr.release_amount), 2) AS seller_release_amount
    FROM releasable_rows rr
    GROUP BY rr.seller_id
  ),
  updated_profiles AS (
    UPDATE public.profiles p
    SET pending_balance = GREATEST(
          0,
          ROUND(COALESCE(p.pending_balance, 0) - rs.seller_release_amount, 2)
        ),
        wallet_balance = ROUND(
          COALESCE(p.wallet_balance, 0) + rs.seller_release_amount,
          2
        )
    FROM releasable_sellers rs
    WHERE p.id = rs.seller_id
    RETURNING p.id
  ),
  updated_froze AS (
    UPDATE public.froze_orders fo
    SET pickup_status = 'picked_up',
        updated_at = now()
    WHERE fo.id IN (SELECT rr.id FROM releasable_rows rr)
    RETURNING fo.id
  )
  SELECT COUNT(*)::integer
  INTO v_released_rows
  FROM updated_froze;

  RETURN v_released_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_seller_pending_on_order_delivery(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_release_seller_pending_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.release_seller_pending_on_order_delivery(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_release_seller_pending_on_delivery ON public.orders;
CREATE TRIGGER trg_orders_release_seller_pending_on_delivery
  AFTER UPDATE OF status, delivery_status ON public.orders
  FOR EACH ROW
  WHEN (
    LOWER(COALESCE(NEW.delivery_status::text, '')) = 'delivered'
    OR LOWER(COALESCE(NEW.status::text, '')) = 'delivered'
  )
  EXECUTE FUNCTION public.trg_release_seller_pending_on_delivery();

CREATE OR REPLACE FUNCTION public.rebuild_seller_financials(
  p_storehouse_factor numeric DEFAULT NULL
)
RETURNS TABLE(
  updated_order_items integer,
  updated_froze_orders integer,
  updated_profiles integer,
  applied_storehouse_factor numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_factor numeric := 0.8;
  v_updated_order_items integer := 0;
  v_updated_froze_primary integer := 0;
  v_updated_froze_orphan integer := 0;
  v_updated_profiles integer := 0;
BEGIN
  IF p_storehouse_factor IS NOT NULL THEN
    v_factor := p_storehouse_factor;
    IF v_factor > 1 THEN
      v_factor := v_factor / 100;
    END IF;

    IF v_factor <= 0 OR v_factor > 1 THEN
      RAISE EXCEPTION 'Invalid storehouse factor: %', p_storehouse_factor;
    END IF;

    INSERT INTO public.website_settings (setting_key, setting_value, updated_at)
    VALUES ('seller_storehouse_factor', v_factor::text, now())
    ON CONFLICT (setting_key) DO UPDATE
    SET setting_value = EXCLUDED.setting_value,
        updated_at = EXCLUDED.updated_at;
  END IF;

  v_factor := public.get_seller_storehouse_factor();

  UPDATE public.order_items oi
  SET storehouse_price = ROUND(COALESCE(oi.unit_price, 0) * v_factor, 2)
  WHERE oi.storehouse_price IS DISTINCT FROM ROUND(COALESCE(oi.unit_price, 0) * v_factor, 2);
  GET DIAGNOSTICS v_updated_order_items = ROW_COUNT;

  WITH per_order AS (
    SELECT
      oi.order_id,
      oi.seller_id,
      ROUND(SUM(COALESCE(oi.line_total, 0)), 2) AS subtotal,
      ROUND(SUM(COALESCE(oi.storehouse_price, 0) * COALESCE(oi.quantity, 0)), 2) AS storehouse_total
    FROM public.order_items oi
    WHERE oi.order_id IS NOT NULL
      AND oi.seller_id IS NOT NULL
    GROUP BY oi.order_id, oi.seller_id
  )
  UPDATE public.froze_orders fo
  SET amount = COALESCE(po.storehouse_total, 0),
      profit = GREATEST(0, ROUND(COALESCE(po.subtotal, 0) - COALESCE(po.storehouse_total, 0), 2)),
      updated_at = now()
  FROM per_order po
  WHERE fo.order_id = po.order_id
    AND fo.seller_id = po.seller_id
    AND (
      fo.amount IS DISTINCT FROM COALESCE(po.storehouse_total, 0)
      OR fo.profit IS DISTINCT FROM GREATEST(0, ROUND(COALESCE(po.subtotal, 0) - COALESCE(po.storehouse_total, 0), 2))
    );
  GET DIAGNOSTICS v_updated_froze_primary = ROW_COUNT;

  UPDATE public.froze_orders fo
  SET amount = 0,
      profit = 0,
      updated_at = now()
  WHERE NOT EXISTS (
      SELECT 1
      FROM public.order_items oi
      WHERE oi.order_id = fo.order_id
        AND oi.seller_id = fo.seller_id
    )
    AND (COALESCE(fo.amount, 0) <> 0 OR COALESCE(fo.profit, 0) <> 0);
  GET DIAGNOSTICS v_updated_froze_orphan = ROW_COUNT;

  WITH seller_ids AS (
    SELECT p.id AS seller_id
    FROM public.profiles p
    WHERE p.role = 'seller'
  ),
  wallet_txn AS (
    SELECT
      wt.user_id AS seller_id,
      ROUND(SUM(
        CASE wt.type
          WHEN 'recharge' THEN COALESCE(wt.amount, 0)
          WHEN 'refund' THEN COALESCE(wt.amount, 0)
          WHEN 'bonus' THEN COALESCE(wt.amount, 0)
          WHEN 'debit' THEN -COALESCE(wt.amount, 0)
          ELSE 0
        END
      ), 2) AS txn_delta
    FROM public.wallet_transactions wt
    GROUP BY wt.user_id
  ),
  paid_withdrawals AS (
    SELECT
      w.seller_id,
      ROUND(SUM(COALESCE(w.amount, 0)), 2) AS paid_total
    FROM public.withdrawals w
    WHERE LOWER(COALESCE(w.status, '')) = 'paid'
    GROUP BY w.seller_id
  ),
  paid_storehouse AS (
    SELECT
      fo.seller_id,
      ROUND(SUM(COALESCE(fo.amount, 0)), 2) AS paid_storehouse_total
    FROM public.froze_orders fo
    WHERE LOWER(COALESCE(fo.payment_status, '')) = 'paid'
    GROUP BY fo.seller_id
  ),
  released_gross AS (
    SELECT
      fo.seller_id,
      ROUND(SUM(COALESCE(fo.amount, 0) + COALESCE(fo.profit, 0)), 2) AS released_gross_total
    FROM public.froze_orders fo
    WHERE LOWER(COALESCE(fo.payment_status, '')) = 'paid'
      AND LOWER(COALESCE(fo.pickup_status, '')) = 'picked_up'
    GROUP BY fo.seller_id
  ),
  pending_gross AS (
    SELECT
      fo.seller_id,
      ROUND(SUM(COALESCE(fo.amount, 0) + COALESCE(fo.profit, 0)), 2) AS pending_gross_total
    FROM public.froze_orders fo
    WHERE LOWER(COALESCE(fo.payment_status, '')) = 'paid'
      AND LOWER(COALESCE(fo.pickup_status, '')) <> 'picked_up'
    GROUP BY fo.seller_id
  ),
  next_values AS (
    SELECT
      s.seller_id,
      GREATEST(
        0,
        ROUND(
          COALESCE(tx.txn_delta, 0)
          - COALESCE(wd.paid_total, 0)
          - COALESCE(sp.paid_storehouse_total, 0)
          + COALESCE(rg.released_gross_total, 0),
          2
        )
      ) AS next_wallet_balance,
      GREATEST(0, ROUND(COALESCE(pg.pending_gross_total, 0), 2)) AS next_pending_balance,
      GREATEST(0, ROUND(COALESCE(wd.paid_total, 0), 2)) AS next_total_withdrawn
    FROM seller_ids s
    LEFT JOIN wallet_txn tx ON tx.seller_id = s.seller_id
    LEFT JOIN paid_withdrawals wd ON wd.seller_id = s.seller_id
    LEFT JOIN paid_storehouse sp ON sp.seller_id = s.seller_id
    LEFT JOIN released_gross rg ON rg.seller_id = s.seller_id
    LEFT JOIN pending_gross pg ON pg.seller_id = s.seller_id
  )
  UPDATE public.profiles p
  SET wallet_balance = nv.next_wallet_balance,
      pending_balance = nv.next_pending_balance,
      total_withdrawn = nv.next_total_withdrawn
  FROM next_values nv
  WHERE p.id = nv.seller_id
    AND (
      p.wallet_balance IS DISTINCT FROM nv.next_wallet_balance
      OR p.pending_balance IS DISTINCT FROM nv.next_pending_balance
      OR p.total_withdrawn IS DISTINCT FROM nv.next_total_withdrawn
    );
  GET DIAGNOSTICS v_updated_profiles = ROW_COUNT;

  RETURN QUERY
  SELECT
    v_updated_order_items,
    v_updated_froze_primary + v_updated_froze_orphan,
    v_updated_profiles,
    v_factor;
END;
$$;

WITH delivered_orders AS (
  SELECT DISTINCT fo.order_id
  FROM public.froze_orders fo
  JOIN public.orders o ON o.id = fo.order_id
  WHERE LOWER(COALESCE(fo.payment_status, '')) = 'paid'
    AND LOWER(COALESCE(fo.pickup_status, '')) <> 'picked_up'
    AND (
      LOWER(COALESCE(o.delivery_status::text, '')) = 'delivered'
      OR LOWER(COALESCE(o.status::text, '')) = 'delivered'
    )
)
SELECT public.release_seller_pending_on_order_delivery(order_id)
FROM delivered_orders;

SELECT * FROM public.rebuild_seller_financials(NULL);
