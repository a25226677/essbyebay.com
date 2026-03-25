-- Migration 20260326_000001 — Set seller_storehouse_factor to 0.8
-- Inserts or updates the website_settings key used by checkout and admin UI

INSERT INTO website_settings (setting_key, setting_value, updated_at)
VALUES ('seller_storehouse_factor', '0.8', now())
ON CONFLICT (setting_key) DO UPDATE
  SET setting_value = EXCLUDED.setting_value,
      updated_at = EXCLUDED.updated_at;
