alter table rooms add column if not exists background_url text;
alter table rooms add column if not exists background_updated_at timestamptz;

alter table rooms drop constraint if exists rooms_background_url_storage;
alter table rooms add constraint rooms_background_url_storage
  check (background_url is null or background_url = id || '/background.webp');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-backgrounds', 'room-backgrounds', true, 2097152, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "room background read" on storage.objects;
create policy "room background read" on storage.objects
  for select to authenticated using (
    bucket_id = 'room-backgrounds'
    and name = (storage.foldername(name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(name))[1])
  );

drop policy if exists "room background write" on storage.objects;
create policy "room background write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'room-backgrounds'
    and name = (storage.foldername(name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(name))[1])
  );

drop policy if exists "room background update" on storage.objects;
create policy "room background update" on storage.objects
  for update to authenticated using (
    bucket_id = 'room-backgrounds'
    and name = (storage.foldername(name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(name))[1])
  ) with check (
    bucket_id = 'room-backgrounds'
    and name = (storage.foldername(name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(name))[1])
  );

drop policy if exists "room background delete" on storage.objects;
create policy "room background delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'room-backgrounds'
    and name = (storage.foldername(name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(name))[1])
  );
