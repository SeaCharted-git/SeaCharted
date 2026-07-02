-- Phase 2 + 3 schema: conditions on dives, user-submitted dive sites,
-- species, sightings, observations, hashtag mentions, admin flag.

-- Admin flag on profiles.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Allow authenticated users to submit new dive sites (off-list pins).
alter table public.dive_sites
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists is_verified boolean not null default true;

-- Backfill existing seeded sites as verified.
update public.dive_sites set is_verified = true where submitted_by is null;

create policy "dive_sites_user_insert" on public.dive_sites
  for insert to authenticated
  with check (submitted_by = auth.uid() and is_verified = false);

create policy "dive_sites_admin_update" on public.dive_sites
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- Extend dives with above/underwater conditions + cover photo pointer.
create type public.sky_state as enum ('sunny', 'partly_cloudy', 'cloudy', 'rainy');
create type public.wind_cardinal as enum ('N','NE','E','SE','S','SW','W','NW');
create type public.current_strength as enum ('light', 'moderate', 'strong');
create type public.current_direction as enum ('normal_s_to_n', 'reversed_n_to_s', 'changing');

alter table public.dives
  add column if not exists sky public.sky_state,
  add column if not exists wind_kts numeric(4, 1) check (wind_kts is null or wind_kts >= 0),
  add column if not exists wind_dir public.wind_cardinal,
  add column if not exists moon_phase numeric(3, 2) check (moon_phase is null or (moon_phase >= 0 and moon_phase <= 1)),
  add column if not exists current_strength public.current_strength,
  add column if not exists current_direction public.current_direction,
  add column if not exists visibility_m numeric(4, 1) check (visibility_m is null or visibility_m >= 0),
  add column if not exists water_temp_c_observed numeric(4, 1),
  add column if not exists cover_photo_id uuid;

-- Species catalog.
create type public.species_category as enum (
  'marine_plant', 'sponge', 'coral', 'invertebrate', 'fish', 'sea_turtle', 'marine_mammal'
);

create table if not exists public.species (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  common_name text not null,
  scientific_name text unique not null,
  category public.species_category not null,
  description text,
  source_reference text,
  is_verified boolean not null default true,
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists species_category_idx on public.species (category);
create index if not exists species_slug_idx on public.species (slug);
create index if not exists species_common_idx on public.species (common_name);

alter table public.species enable row level security;

create policy "species_public_read" on public.species
  for select using (is_verified = true or submitted_by = auth.uid());

create policy "species_user_insert" on public.species
  for insert to authenticated
  with check (submitted_by = auth.uid() and is_verified = false);

create policy "species_admin_update" on public.species
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Sightings: species observed on a dive.
create type public.sighting_count as enum ('count_1', 'count_2_5', 'count_5_20', 'count_20_plus', 'count_school');

create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  dive_id uuid not null references public.dives(id) on delete cascade,
  species_id uuid not null references public.species(id) on delete restrict,
  count_bucket public.sighting_count not null,
  note text,
  created_at timestamptz not null default now(),
  unique (dive_id, species_id)
);

create index if not exists sightings_dive_idx on public.sightings (dive_id);
create index if not exists sightings_species_idx on public.sightings (species_id);

alter table public.sightings enable row level security;

create policy "sightings_read" on public.sightings
  for select using (
    exists (
      select 1 from public.dives d
      where d.id = sightings.dive_id
        and (d.user_id = auth.uid() or d.is_public = true)
    )
  );

create policy "sightings_owner_write" on public.sightings
  for all using (
    exists (select 1 from public.dives d where d.id = sightings.dive_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.dives d where d.id = sightings.dive_id and d.user_id = auth.uid())
  );

-- Observations: free-text specific observations bucketed by kind, with #hashtags.
create type public.observation_bucket as enum ('disease', 'anomaly', 'unlisted_species', 'mating_spawning');

create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  dive_id uuid not null references public.dives(id) on delete cascade,
  bucket public.observation_bucket not null,
  description text not null,
  photo_id uuid references public.dive_photos(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists observations_dive_idx on public.observations (dive_id);
create index if not exists observations_bucket_idx on public.observations (bucket);

alter table public.observations enable row level security;

create policy "observations_read" on public.observations
  for select using (
    exists (
      select 1 from public.dives d
      where d.id = observations.dive_id
        and (d.user_id = auth.uid() or d.is_public = true)
    )
  );

create policy "observations_owner_write" on public.observations
  for all using (
    exists (select 1 from public.dives d where d.id = observations.dive_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.dives d where d.id = observations.dive_id and d.user_id = auth.uid())
  );

-- Hashtag mentions: parsed from observation descriptions, auto-linked to species when possible.
create table if not exists public.hashtag_mentions (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.observations(id) on delete cascade,
  tag text not null,
  species_id uuid references public.species(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists hashtag_mentions_tag_idx on public.hashtag_mentions (tag);
create index if not exists hashtag_mentions_species_idx on public.hashtag_mentions (species_id);
create index if not exists hashtag_mentions_observation_idx on public.hashtag_mentions (observation_id);

alter table public.hashtag_mentions enable row level security;

create policy "hashtag_mentions_read" on public.hashtag_mentions
  for select using (
    exists (
      select 1 from public.observations o
      join public.dives d on d.id = o.dive_id
      where o.id = hashtag_mentions.observation_id
        and (d.user_id = auth.uid() or d.is_public = true)
    )
  );

create policy "hashtag_mentions_owner_write" on public.hashtag_mentions
  for all using (
    exists (
      select 1 from public.observations o
      join public.dives d on d.id = o.dive_id
      where o.id = hashtag_mentions.observation_id and d.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.observations o
      join public.dives d on d.id = o.dive_id
      where o.id = hashtag_mentions.observation_id and d.user_id = auth.uid()
    )
  );
