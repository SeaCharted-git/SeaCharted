-- Scuba app initial schema
-- Tables: profiles, dive_sites, dives, dive_photos, conditions_cache
-- All timestamps are UTC.

create extension if not exists "pgcrypto";

-- profiles: 1:1 with auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_location text,
  avatar_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- dive_sites: curated in v1 (curated_by is admin or null for seeded rows)
create type public.difficulty as enum ('beginner', 'intermediate', 'advanced');
create type public.site_type as enum ('reef', 'wall', 'drift', 'wreck', 'shore', 'cavern', 'other');

create table public.dive_sites (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  description text,
  difficulty public.difficulty,
  max_depth_m numeric(4, 1) check (max_depth_m > 0),
  site_type public.site_type,
  curated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index dive_sites_slug_idx on public.dive_sites (slug);

-- dives: user's logged dives
create table public.dives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.dive_sites(id) on delete restrict,
  dive_date date not null,
  max_depth_m numeric(4, 1) check (max_depth_m > 0),
  duration_min integer check (duration_min > 0),
  buddy_name text,
  notes text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create index dives_user_id_idx on public.dives (user_id, dive_date desc);
create index dives_site_id_idx on public.dives (site_id) where is_public = true;

-- dive_photos: photos tied to a dive
create table public.dive_photos (
  id uuid primary key default gen_random_uuid(),
  dive_id uuid not null references public.dives(id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index dive_photos_dive_id_idx on public.dive_photos (dive_id);

-- conditions_cache: TTL'd surface conditions per site (15 min)
create type public.tide_state as enum ('low', 'rising', 'high', 'falling');

create table public.conditions_cache (
  site_id uuid primary key references public.dive_sites(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  wind_kts numeric(4, 1),
  wind_dir_deg integer check (wind_dir_deg between 0 and 360),
  air_temp_c numeric(4, 1),
  water_temp_c numeric(4, 1),
  swell_m numeric(3, 2),
  swell_period_s numeric(4, 1),
  tide_state public.tide_state
);

-- profiles: auto-create on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security
alter table public.profiles enable row level security;
alter table public.dive_sites enable row level security;
alter table public.dives enable row level security;
alter table public.dive_photos enable row level security;
alter table public.conditions_cache enable row level security;

-- profiles: user sees + edits own; public profiles readable by all
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_public_read" on public.profiles
  for select using (is_public = true);
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- dive_sites: world-readable; writes locked (admin will insert via service role)
create policy "dive_sites_public_read" on public.dive_sites
  for select using (true);

-- dives: user sees own always; public dives readable by all
create policy "dives_owner_read" on public.dives
  for select using (auth.uid() = user_id);
create policy "dives_public_read" on public.dives
  for select using (is_public = true);
create policy "dives_owner_insert" on public.dives
  for insert with check (auth.uid() = user_id);
create policy "dives_owner_update" on public.dives
  for update using (auth.uid() = user_id);
create policy "dives_owner_delete" on public.dives
  for delete using (auth.uid() = user_id);

-- dive_photos: readable when the parent dive is readable; write locked to dive owner
create policy "dive_photos_owner_read" on public.dive_photos
  for select using (
    exists (
      select 1 from public.dives d
      where d.id = dive_photos.dive_id
        and (d.user_id = auth.uid() or d.is_public = true)
    )
  );
create policy "dive_photos_owner_write" on public.dive_photos
  for all using (
    exists (
      select 1 from public.dives d
      where d.id = dive_photos.dive_id and d.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.dives d
      where d.id = dive_photos.dive_id and d.user_id = auth.uid()
    )
  );

-- conditions_cache: world-readable; writes via service role only (backend proxy)
create policy "conditions_public_read" on public.conditions_cache
  for select using (true);
