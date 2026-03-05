-- Migration: Add customer wallet, credit score, package, and virtual fields to profiles

alter table public.profiles
  add column if not exists wallet_balance numeric(12,2) not null default 0 check (wallet_balance >= 0),
  add column if not exists credit_score   integer not null default 100,
  add column if not exists package        text default null,
  add column if not exists is_virtual     boolean not null default false,
  add column if not exists disable_login  boolean not null default false;

-- Create wallet_transactions table for audit trail of recharges
create table if not exists public.wallet_transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      numeric(12,2) not null,
  type        text not null check (type in ('recharge', 'debit', 'refund', 'bonus')),
  note        text,
  admin_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Create payout_requests table (customer withdrawal requests)
create table if not exists public.payout_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      text not null default 'bank_transfer',
  account_info text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on column public.profiles.wallet_balance  is 'Customer wallet/credit balance in USD';
comment on column public.profiles.credit_score    is 'Admin-managed trust score 0-1000, default 100';
comment on column public.profiles.package         is 'Optional subscription package name';
comment on column public.profiles.is_virtual      is 'True for auto-generated virtual/test customers';
comment on column public.profiles.disable_login   is 'Prevent virtual customers from logging in';
