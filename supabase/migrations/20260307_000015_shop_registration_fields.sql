-- ── Shop registration extra fields ──────────────────────────────
-- Add fields for full seller registration form

-- Add shop address
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS address text;

-- Add certificate & transaction password fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS transaction_password text,
  ADD COLUMN IF NOT EXISTS certificate_type     text      NOT NULL DEFAULT 'id_card',
  ADD COLUMN IF NOT EXISTS certificate_front_url text,
  ADD COLUMN IF NOT EXISTS certificate_back_url  text;

-- OTP codes table for email verification
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  code       text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);

-- Auto-cleanup expired OTPs (optional – can also cron)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "otp_service_only" ON public.otp_codes USING (true) WITH CHECK (true);
