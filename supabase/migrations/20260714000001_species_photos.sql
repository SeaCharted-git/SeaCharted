-- Species photos: admin-uploaded gallery per species, with one flagged primary.
-- The primary photo drives thumbnails on the research index, species detail hero,
-- dive-log species picker, and site-page recent sightings.

create table if not exists public.species_photos (
  id            uuid primary key default gen_random_uuid(),
  species_id    uuid not null references public.species(id) on delete cascade,
  storage_path  text not null,
  is_primary    boolean not null default false,
  credit        text,
  source_url    text,
  license       text,
  uploaded_by   uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists species_photos_species_id_idx
  on public.species_photos (species_id);

-- Exactly one primary per species. Partial unique index — non-primary rows
-- don't conflict with each other.
create unique index if not exists species_photos_primary_uniq
  on public.species_photos (species_id) where is_primary = true;

alter table public.species_photos enable row level security;

-- Public read: species pages are world-readable, so photos are too.
create policy "species_photos_public_read" on public.species_photos
  for select using (true);

-- Admin writes only. Same gate pattern as species_admin_update in phase_2_3.
create policy "species_photos_admin_insert" on public.species_photos
  for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "species_photos_admin_update" on public.species_photos
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "species_photos_admin_delete" on public.species_photos
  for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Auto-promote: when the primary is deleted, promote the newest remaining
-- photo (if any) to primary. Blocks orphaned "no primary" state as long as
-- at least one photo remains.
create or replace function public.auto_promote_species_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_primary then
    update public.species_photos
      set is_primary = true
      where id = (
        select id from public.species_photos
        where species_id = old.species_id
        order by created_at desc
        limit 1
      );
  end if;
  return old;
end;
$$;

drop trigger if exists species_photos_auto_promote on public.species_photos;
create trigger species_photos_auto_promote
  after delete on public.species_photos
  for each row execute function public.auto_promote_species_photo();

-- Storage bucket: public read, admin write.
insert into storage.buckets (id, name, public)
values ('species-photos', 'species-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "species_photos_bucket_public_read" on storage.objects;
drop policy if exists "species_photos_bucket_admin_insert" on storage.objects;
drop policy if exists "species_photos_bucket_admin_update" on storage.objects;
drop policy if exists "species_photos_bucket_admin_delete" on storage.objects;

create policy "species_photos_bucket_public_read" on storage.objects
  for select using (bucket_id = 'species-photos');

create policy "species_photos_bucket_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'species-photos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "species_photos_bucket_admin_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'species-photos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "species_photos_bucket_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'species-photos'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
