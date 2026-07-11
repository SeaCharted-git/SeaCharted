-- Phase C: extend dive_photos to also hold videos.
-- MVP design: single table with a media_type column, not a rename to dive_media.
-- Additive columns only; existing rows keep media_type = 'photo' by default.

create type public.media_type as enum ('photo', 'video');

alter table public.dive_photos
  add column if not exists media_type public.media_type not null default 'photo',
  add column if not exists duration_ms integer check (duration_ms is null or duration_ms > 0),
  add column if not exists poster_path text;

-- Storage bucket for videos: public read (URLs are UUID-obscured), 50 MB cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dive-videos',
  'dive-videos',
  true,
  52428800,
  ARRAY['video/mp4','video/quicktime','video/webm','video/x-m4v']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "dive_videos_authenticated_upload" on storage.objects;
drop policy if exists "dive_videos_owner_delete" on storage.objects;
drop policy if exists "dive_videos_owner_update" on storage.objects;

create policy "dive_videos_authenticated_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dive-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dive_videos_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dive-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dive_videos_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dive-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
