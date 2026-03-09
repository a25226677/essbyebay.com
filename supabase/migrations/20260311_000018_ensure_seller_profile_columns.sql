-- Catch-up migration for environments that missed seller profile field migrations.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credit_score           integer       NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS package                text,
  ADD COLUMN IF NOT EXISTS is_verified            boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS balance                numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guarantee_money        numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_balance        numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_views           integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_permission     boolean       NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS home_display           boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_info      text,
  ADD COLUMN IF NOT EXISTS invitation_code        text,
  ADD COLUMN IF NOT EXISTS salesman_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS identity_card_url      text,
  ADD COLUMN IF NOT EXISTS total_recharge         numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_withdrawn        numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seller_approved        boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transaction_password   text,
  ADD COLUMN IF NOT EXISTS certificate_type       text          NOT NULL DEFAULT 'id_card',
  ADD COLUMN IF NOT EXISTS certificate_front_url  text,
  ADD COLUMN IF NOT EXISTS certificate_back_url   text;

UPDATE public.profiles
SET credit_score = 100
WHERE role = 'seller' AND COALESCE(credit_score, 0) = 0;

-- ── Withdrawals extra columns (from migration 000010) ────────────
ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS account_info  text,
  ADD COLUMN IF NOT EXISTS withdraw_type text NOT NULL DEFAULT 'bank';

-- ── Seller payments table (admin pays out to seller) ─────────────
CREATE TABLE IF NOT EXISTS public.seller_payments (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          numeric(12,2) NOT NULL,
  payment_details text,
  trx_id          text,
  admin_id        uuid         REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_payments_seller_id ON public.seller_payments(seller_id);

ALTER TABLE public.seller_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'seller_payments'
      AND policyname = 'admin_seller_payments'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "admin_seller_payments" ON public.seller_payments
        USING (true) WITH CHECK (true)
    $p$;
  END IF;
END $$;