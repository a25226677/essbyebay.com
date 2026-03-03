# Supabase Production Setup

## 1) Apply database schema

Run the SQL migration in your Supabase project:

- File: `supabase/migrations/20260222_000001_init_ecommerce.sql`
- Option A: Supabase Dashboard → SQL Editor → paste/run
- Option B: Supabase CLI migrations

## 2) Configure Auth URLs

In Supabase Dashboard → Authentication → URL Configuration:

- Site URL: your app base URL (e.g. `http://localhost:3000`)
- Additional Redirect URLs should include:
  - `http://localhost:3000/auth/callback`
  - `https://your-domain.com/auth/callback`

Password reset now uses:

- `/auth/callback?next=/password/update`

## 3) Environment variables

In `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

## 4) Promote a user to seller/admin

When a user signs up, a `profiles` row is auto-created by trigger with default role `customer`.

Use SQL to promote:

```sql
update public.profiles
set role = 'seller'
where id = 'USER_UUID_HERE';
```

Admin:

```sql
update public.profiles
set role = 'admin'
where id = 'USER_UUID_HERE';
```

## 5) What is now protected

- `/account` requires login
- Seller dashboard routes under `/seller/*` (except `/seller/login` and `/seller/create`) require login + `seller/admin` role
- Customer login redirects sellers/admins to seller dashboard automatically
- Seller login rejects non-seller accounts
