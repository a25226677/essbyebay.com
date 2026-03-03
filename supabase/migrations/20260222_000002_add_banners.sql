-- Add dynamic home banners for admin management

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  link text not null default '/search',
  button_text text not null default 'Shop Now',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_banners_sort_order on public.banners(sort_order);
create index if not exists idx_banners_active on public.banners(is_active);

create trigger trg_banners_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

alter table public.banners enable row level security;

create policy "banners_public_read_active" on public.banners
for select using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

create policy "banners_admin_manage" on public.banners
for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

insert into public.banners (title, subtitle, image_url, link, button_text, sort_order)
values
  (
    'Welcome to Seller Store',
    'Discover amazing deals from trusted sellers worldwide',
    '/images/placeholders/hero-banner-1.svg',
    '/search',
    'Shop Now',
    1
  ),
  (
    'Flash Sale — Up to 50% Off',
    'Limited time offers on top brands. Don''t miss out!',
    '/images/placeholders/hero-banner-2.svg',
    '/flash-deals',
    'View Deals',
    2
  ),
  (
    'New Arrivals — Spring 2026',
    'Fresh styles for the new season. Be the first to shop.',
    '/images/placeholders/hero-banner-3.svg',
    '/search',
    'Explore',
    3
  )
on conflict do nothing;
