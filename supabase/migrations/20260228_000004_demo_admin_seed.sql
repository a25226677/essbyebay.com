-- =============================================================================
-- DEMO ADMIN CREDENTIALS SEED
-- =============================================================================
-- Email:    admin@demo.com
-- Password: Admin@123456
--
-- Run this script in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- or via: supabase db reset (if using local dev)
-- =============================================================================

-- Step 1: Create the auth user (Supabase auth.users table)
-- NOTE: Replace the UUIDs if you need deterministic IDs
DO $$
DECLARE
  demo_admin_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    last_sign_in_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    demo_admin_id,
    'authenticated',
    'authenticated',
    'admin@demo.com',
    crypt('Admin@123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Admin"}',
    false,
    now(),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE
    SET encrypted_password = crypt('Admin@123456', gen_salt('bf')),
        email = 'admin@demo.com',
        updated_at = now();

  -- Also ensure the identities row exists
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    demo_admin_id,
    demo_admin_id,
    'admin@demo.com',
    jsonb_build_object('sub', demo_admin_id::text, 'email', 'admin@demo.com'),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Step 2: Upsert the profile with role = 'admin'
  INSERT INTO public.profiles (id, full_name, role, is_active, created_at, updated_at)
  VALUES (
    demo_admin_id,
    'Demo Admin',
    'admin',
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        full_name = 'Demo Admin',
        is_active = true,
        updated_at = now();

  RAISE NOTICE 'Demo admin created successfully.';
  RAISE NOTICE 'Email: admin@demo.com';
  RAISE NOTICE 'Password: Admin@123456';
END;
$$;
