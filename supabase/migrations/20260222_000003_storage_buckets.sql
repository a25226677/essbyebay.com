-- Create storage buckets for seller uploads
-- Run this in the Supabase SQL editor or via CLI

-- 1) Product images bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- 2) Shop assets bucket (logos, banners)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-assets',
  'shop-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

-- 3) Seller files bucket (PDFs, documents, digital downloads)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'seller-files',
  'seller-files',
  false,
  52428800, -- 50 MB
  array['application/pdf', 'application/zip', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
on conflict (id) do nothing;

-- ── RLS policies ──

-- product-images: anyone can view, authenticated sellers can upload/delete their own
create policy "Public read product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Sellers upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Sellers delete own product images"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- shop-assets: anyone can view, owner can upload/delete
create policy "Public read shop assets"
  on storage.objects for select
  using (bucket_id = 'shop-assets');

create policy "Sellers upload shop assets"
  on storage.objects for insert
  with check (
    bucket_id = 'shop-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Sellers delete own shop assets"
  on storage.objects for delete
  using (
    bucket_id = 'shop-assets'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- seller-files: only owner can CRUD
create policy "Sellers read own files"
  on storage.objects for select
  using (
    bucket_id = 'seller-files'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Sellers upload own files"
  on storage.objects for insert
  with check (
    bucket_id = 'seller-files'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Sellers delete own files"
  on storage.objects for delete
  using (
    bucket_id = 'seller-files'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
