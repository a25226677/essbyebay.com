-- Generic key-value settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT 'null',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default POS salesman activation = false
INSERT INTO public.settings (key, value)
VALUES ('pos_salesman_activation', 'false')
ON CONFLICT (key) DO NOTHING;
