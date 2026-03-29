-- Align froze order release state with real delivery lifecycle, then
-- rebuild seller balances to fix historical wallet/pending mismatches.

WITH desired_release_state AS (
  SELECT
    fo.id,
    CASE
      WHEN LOWER(COALESCE(o.delivery_status, '')) = 'delivered'
        OR LOWER(COALESCE(o.status, '')) = 'delivered'
        THEN 'picked_up'
      ELSE 'unpicked_up'
    END AS next_pickup_status
  FROM public.froze_orders fo
  JOIN public.orders o ON o.id = fo.order_id
  WHERE LOWER(COALESCE(fo.payment_status, '')) = 'paid'
)
UPDATE public.froze_orders fo
SET pickup_status = drs.next_pickup_status,
    updated_at = now()
FROM desired_release_state drs
WHERE fo.id = drs.id
  AND fo.pickup_status IS DISTINCT FROM drs.next_pickup_status;

SELECT * FROM public.rebuild_seller_financials(NULL);
