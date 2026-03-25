-- Create invitations table for DB-backed invitation codes

create table if not exists public.invitations (
  code text primary key,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  expires_at timestamptz,
  is_active boolean default true not null,
  max_uses integer default 1,
  uses integer default 0 not null,
  last_used_by uuid references public.profiles(id) on delete set null,
  last_used_at timestamptz
);

create index if not exists idx_invitations_is_active on public.invitations(is_active);
create index if not exists idx_invitations_expires_at on public.invitations(expires_at);
