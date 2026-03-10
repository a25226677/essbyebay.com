-- ============================================================
-- Migration 000020 — Fix orders.payment_status
--
-- Previously, the seller "pay-store" route (for paying the
-- storehouse/platform fee) was incorrectly setting
-- orders.payment_status = 'succeeded'. This field should only
-- reflect whether the *customer* has paid for their purchase.
-- Storehouse-fee payment is now tracked in froze_orders.
--
-- This migration resets orders whose payment_status was set to
-- 'succeeded' by pay-store but whose customer has NOT actually
-- paid. We identify these as orders that:
--   - have payment_status = 'succeeded'
--   - have a corresponding froze_orders row with payment_status = 'paid'
--     (evidence the status came from storehouse-fee payment)
--   - have no Stripe/gateway confirmation in notes
-- ============================================================

-- Reset payment_status to 'pending' for orders where the only
-- reason for 'succeeded' was the storehouse-fee payment.
-- Orders whose customer genuinely paid (e.g. via Stripe) will
-- not be affected because they won't match the froze_orders join.
UPDATE public.orders o
SET payment_status = 'pending'
WHERE o.payment_status = 'succeeded'
  AND EXISTS (
    SELECT 1 FROM public.froze_orders fo
    WHERE fo.order_id = o.id
      AND fo.payment_status = 'paid'
  )
  -- Preserve orders explicitly confirmed as customer-paid via notes/method
  AND (o.payment_method IS NULL OR o.payment_method NOT IN ('stripe', 'card', 'online'))
  AND (o.notes IS NULL OR o.notes NOT ILIKE '%stripe%');

-- Ensure all froze_orders created before this migration have the
-- correct payment_status reflected (they track storehouse fees).
-- No data change needed since froze_orders already has its own
-- payment_status column independent of orders.payment_status.
