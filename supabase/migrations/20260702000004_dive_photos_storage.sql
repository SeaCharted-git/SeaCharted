-- Storage bucket for dive photos.
-- Bucket is public read (URLs are UUID-obscured); RLS on storage.objects
-- restricts writes/deletes to the owning user.
insert into storage.buckets (id, name, public)
values ('dive-photos', 'dive-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "dive_photos_authenticated_upload" on storage.objects;
drop policy if exists "dive_photos_owner_delete" on storage.objects;
drop policy if exists "dive_photos_owner_update" on storage.objects;

create policy "dive_photos_authenticated_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dive-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dive_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dive-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dive_photos_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dive-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
