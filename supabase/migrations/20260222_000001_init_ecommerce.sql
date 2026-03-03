-- Core ecommerce schema for eSeller Store Bay
-- Apply in Supabase SQL editor or via Supabase CLI migrations

create extension if not exists pgcrypto;

create type public.user_role as enum ('customer', 'seller', 'admin');
create type public.order_status as enum ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  full_name text not null,
  phone text,
  line_1 text not null,
  line_2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  banner_url text,
  description text,
  is_verified boolean not null default false,
  rating numeric(3,2) not null default 0,
  product_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  title text not null,
  slug text not null unique,
  sku text unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= price),
  stock_count integer not null default 0 check (stock_count >= 0),
  image_url text,
  is_active boolean not null default true,
  rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_name text,
  color_hex text,
  size text,
  sku text,
  price_delta numeric(12,2) not null default 0,
  stock_count integer not null default 0 check (stock_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, variant_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  shipping_address_id uuid references public.addresses(id) on delete set null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(product_id, user_id)
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  image_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  subject text not null,
  message text not null,
  status public.ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pending',
  method text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  gross_amount numeric(12,2) not null,
  commission_rate numeric(5,2) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_shop_id on public.products(shop_id);
create index if not exists idx_products_category_id on public.products(category_id);
create index if not exists idx_products_seller_id on public.products(seller_id);
create index if not exists idx_products_is_active on public.products(is_active);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_cart_items_user_id on public.cart_items(user_id);
create index if not exists idx_reviews_product_id on public.reviews(product_id);
create index if not exists idx_conversations_customer_id on public.conversations(customer_id);
create index if not exists idx_conversations_seller_id on public.conversations(seller_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_addresses_updated_at
before update on public.addresses
for each row execute function public.set_updated_at();

create trigger trg_shops_updated_at
before update on public.shops
for each row execute function public.set_updated_at();

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger trg_cart_items_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger trg_blog_posts_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

create trigger trg_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger trg_withdrawals_updated_at
before update on public.withdrawals
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.blog_posts enable row level security;
alter table public.support_tickets enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.withdrawals enable row level security;
alter table public.seller_payouts enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;

create policy "profiles_select_self" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id);

create policy "addresses_owner_all" on public.addresses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "shops_public_read" on public.shops
for select using (true);

create policy "shops_owner_write" on public.shops
for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "categories_public_read" on public.categories
for select using (true);

create policy "brands_public_read" on public.brands
for select using (true);

create policy "products_public_read_active" on public.products
for select using (is_active = true or auth.uid() = seller_id);

create policy "products_seller_write" on public.products
for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

create policy "product_images_public_read" on public.product_images
for select using (
  exists (
    select 1 from public.products p
    where p.id = product_id and (p.is_active = true or p.seller_id = auth.uid())
  )
);

create policy "product_images_seller_write" on public.product_images
for all using (
  exists (
    select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()
  )
);

create policy "product_variants_public_read" on public.product_variants
for select using (
  exists (
    select 1 from public.products p
    where p.id = product_id and (p.is_active = true or p.seller_id = auth.uid())
  )
);

create policy "product_variants_seller_write" on public.product_variants
for all using (
  exists (
    select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()
  )
);

create policy "wishlist_owner_all" on public.wishlist_items
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cart_owner_all" on public.cart_items
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "orders_owner_read_create" on public.orders
for select using (auth.uid() = user_id);

create policy "orders_owner_create" on public.orders
for insert with check (auth.uid() = user_id);

create policy "orders_owner_update" on public.orders
for update using (auth.uid() = user_id);

create policy "order_items_owner_read" on public.order_items
for select using (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  or seller_id = auth.uid()
);

create policy "reviews_public_read" on public.reviews
for select using (true);

create policy "reviews_owner_write" on public.reviews
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "blog_public_read_published" on public.blog_posts
for select using (is_published = true);

create policy "support_owner_all" on public.support_tickets
for all using (auth.uid() = user_id or auth.uid() = seller_id) with check (auth.uid() = user_id or auth.uid() = seller_id);

create policy "conversations_members_read" on public.conversations
for select using (auth.uid() = customer_id or auth.uid() = seller_id);

create policy "conversations_members_write" on public.conversations
for all using (auth.uid() = customer_id or auth.uid() = seller_id)
with check (auth.uid() = customer_id or auth.uid() = seller_id);

create policy "messages_members_read" on public.messages
for select using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.customer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

create policy "messages_sender_insert" on public.messages
for insert with check (
  auth.uid() = sender_id and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.customer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

create policy "withdrawals_seller_all" on public.withdrawals
for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

create policy "payouts_seller_read" on public.seller_payouts
for select using (auth.uid() = seller_id);
