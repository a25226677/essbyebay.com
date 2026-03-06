-- ============================================================
-- Migration 000012 — Seller Withdraw Enhancements, Froze Orders,
--                    Guarantee Recharge, Offline Recharge Photos
-- ============================================================

-- 1. Add seller_id to shops (if not exists) as alias for owner_id lookup
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name='shops' AND column_name='seller_id') THEN
    ALTER TABLE public.shops ADD COLUMN seller_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Sync seller_id from owner_id
UPDATE public.shops SET seller_id = owner_id WHERE seller_id IS NULL;

-- Auto-sync seller_id = owner_id on new shop insert
CREATE OR REPLACE FUNCTION public.sync_shop_seller_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.seller_id IS NULL THEN
    NEW.seller_id := NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shops_sync_seller_id ON public.shops;
CREATE TRIGGER trg_shops_sync_seller_id
  BEFORE INSERT ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.sync_shop_seller_id();

-- 2. Add is_verified and credit_score to profiles if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified       boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_score      integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance           numeric(12,2) NOT NULL DEFAULT 0;

-- 3. Froze orders table (orders that are frozen until seller pays storehouse fee)
CREATE TABLE IF NOT EXISTS public.froze_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_code      text NOT NULL,
  amount          numeric(12,2) NOT NULL DEFAULT 0,
  profit          numeric(12,2) NOT NULL DEFAULT 0,
  payment_status  text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid')),
  pickup_status   text NOT NULL DEFAULT 'unpicked_up'
    CHECK (pickup_status IN ('unpicked_up', 'picked_up')),
  unfreeze_date   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_froze_orders_seller_id ON public.froze_orders(seller_id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER trg_froze_orders_updated_at
  BEFORE UPDATE ON public.froze_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Guarantee recharge requests
CREATE TABLE IF NOT EXISTS public.guarantee_recharges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount          numeric(12,2) NOT NULL,
  method          text NOT NULL DEFAULT 'bank',
  photo_url       text,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guarantee_recharges_seller ON public.guarantee_recharges(seller_id);

-- 5. Add storehouse_price to order_items for profit calculation
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS storehouse_price numeric(12,2) NOT NULL DEFAULT 0;

-- 6. Add order_code to orders table for display
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_code text;

-- Generate order codes for existing orders
UPDATE public.orders SET order_code = 
  TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM()*99999999)::text, 8, '0')
WHERE order_code IS NULL;

-- 7. Add coupon_amount and tax_amount to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount    numeric(12,2) NOT NULL DEFAULT 0;

-- 8. RLS policies
ALTER TABLE public.froze_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarantee_recharges ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "sellers_own_froze_orders" ON public.froze_orders;
CREATE POLICY "sellers_own_froze_orders" ON public.froze_orders
  FOR ALL TO authenticated
  USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "admin_froze_orders" ON public.froze_orders;
CREATE POLICY "admin_froze_orders" ON public.froze_orders
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "sellers_own_guarantee" ON public.guarantee_recharges;
CREATE POLICY "sellers_own_guarantee" ON public.guarantee_recharges
  FOR ALL TO authenticated
  USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "admin_guarantee" ON public.guarantee_recharges;
CREATE POLICY "admin_guarantee" ON public.guarantee_recharges
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
