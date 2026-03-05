-- ── Seller extra profile fields ─────────────────────────────────
alter table public.profiles
  add column if not exists guarantee_money      numeric(12,2) not null default 0,
  add column if not exists pending_balance      numeric(12,2) not null default 0,
  add column if not exists seller_views         integer       not null default 0,
  add column if not exists comment_permission   boolean       not null default true,
  add column if not exists home_display         boolean       not null default false,
  add column if not exists verification_info    text,
  add column if not exists invitation_code      text,
  add column if not exists salesman_id          uuid references public.profiles(id) on delete set null,
  add column if not exists identity_card_url    text,
  add column if not exists total_recharge       numeric(12,2) not null default 0,
  add column if not exists total_withdrawn      numeric(12,2) not null default 0,
  add column if not exists seller_approved      boolean       not null default false;

-- ── Enhance withdrawals table ────────────────────────────────────
alter table public.withdrawals
  add column if not exists account_info  text,
  add column if not exists withdraw_type text not null default 'bank';

-- ── Seller payments (admin pays out to seller) ───────────────────
create table if not exists public.seller_payments (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references public.profiles(id) on delete cascade,
  amount          numeric(12,2) not null,
  payment_details text,
  trx_id          text,
  admin_id        uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_seller_payments_seller_id on public.seller_payments(seller_id);
create index if not exists idx_withdrawals_seller_id     on public.withdrawals(seller_id);

-- Row level security
alter table public.seller_payments enable row level security;
create policy if not exists "admin_seller_payments" on public.seller_payments
  using (true) with check (true);
