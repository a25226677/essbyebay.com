-- Migration: Add delivery_status, pickup_status, tracking_code, payment_method to orders
-- These fields support the admin All Orders / Order Detail UI

alter table public.orders
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending', 'confirmed', 'picked_up', 'on_the_way', 'delivered')),
  add column if not exists pickup_status text not null default 'unpicked_up'
    check (pickup_status in ('unpicked_up', 'picked_up')),
  add column if not exists tracking_code text,
  add column if not exists payment_method text not null default 'online';

-- Sync delivery_status from existing status values
update public.orders set delivery_status = 'delivered' where status = 'delivered';
update public.orders set delivery_status = 'confirmed'  where status in ('paid', 'processing');
update public.orders set delivery_status = 'on_the_way' where status = 'shipped';

-- Sync pickup_status for delivered/shipped orders
update public.orders set pickup_status = 'picked_up'
  where status in ('shipped', 'delivered');

-- Sync payment_method for existing orders created via POS (notes contain 'pos')
-- (no-op if no matching rows; safe to run)
update public.orders set payment_method = 'cash' where notes ilike '%pos%';

comment on column public.orders.delivery_status is 'pending|confirmed|picked_up|on_the_way|delivered';
comment on column public.orders.pickup_status   is 'unpicked_up|picked_up';
comment on column public.orders.tracking_code   is 'Optional courier tracking number';
comment on column public.orders.payment_method  is 'online|cash|card|bank_transfer';
