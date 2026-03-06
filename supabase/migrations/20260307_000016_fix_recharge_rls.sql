-- ── Fix RLS policies for offline_recharges & guarantee_recharges ───────────
-- These tables had RLS enabled but were missing INSERT/SELECT policies,
-- causing "new row violates row-level security policy" errors for sellers.

-- ── offline_recharges ────────────────────────────────────────────────────────
ALTER TABLE public.offline_recharges ENABLE ROW LEVEL SECURITY;

-- Sellers can insert their own recharge requests
DROP POLICY IF EXISTS "offline_recharges_insert_own" ON public.offline_recharges;
CREATE POLICY "offline_recharges_insert_own"
  ON public.offline_recharges
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Sellers can read their own recharge history
DROP POLICY IF EXISTS "offline_recharges_select_own" ON public.offline_recharges;
CREATE POLICY "offline_recharges_select_own"
  ON public.offline_recharges
  FOR SELECT
  USING (user_id = auth.uid());

-- Service-role / admin full access (covers API routes using service key)
DROP POLICY IF EXISTS "offline_recharges_service_all" ON public.offline_recharges;
CREATE POLICY "offline_recharges_service_all"
  ON public.offline_recharges
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── guarantee_recharges ──────────────────────────────────────────────────────
ALTER TABLE public.guarantee_recharges ENABLE ROW LEVEL SECURITY;

-- Sellers can insert their own guarantee recharge requests
DROP POLICY IF EXISTS "guarantee_recharges_insert_own" ON public.guarantee_recharges;
CREATE POLICY "guarantee_recharges_insert_own"
  ON public.guarantee_recharges
  FOR INSERT
  WITH CHECK (seller_id = auth.uid());

-- Sellers can read their own guarantee recharge history
DROP POLICY IF EXISTS "guarantee_recharges_select_own" ON public.guarantee_recharges;
CREATE POLICY "guarantee_recharges_select_own"
  ON public.guarantee_recharges
  FOR SELECT
  USING (seller_id = auth.uid());

-- Service-role / admin full access
DROP POLICY IF EXISTS "guarantee_recharges_service_all" ON public.guarantee_recharges;
CREATE POLICY "guarantee_recharges_service_all"
  ON public.guarantee_recharges
  FOR ALL
  USING (true)
  WITH CHECK (true);
