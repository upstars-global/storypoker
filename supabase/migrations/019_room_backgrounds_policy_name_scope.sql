drop policy if exists "room background read" on storage.objects;
create policy "room background read" on storage.objects
  for select to authenticated using (
    bucket_id = 'room-backgrounds'
    and objects.name = (storage.foldername(objects.name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(objects.name))[1])
  );

drop policy if exists "room background write" on storage.objects;
create policy "room background write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'room-backgrounds'
    and objects.name = (storage.foldername(objects.name))[1] || '/background.webp'
    and exists (
      select 1 from public.rooms
      where rooms.id = (storage.foldername(objects.name))[1]
        and rooms.background_owner_id = (select auth.uid())
    )
  );

drop policy if exists "room background update" on storage.objects;
create policy "room background update" on storage.objects
  for update to authenticated using (
    bucket_id = 'room-backgrounds'
    and objects.name = (storage.foldername(objects.name))[1] || '/background.webp'
    and exists (
      select 1 from public.rooms
      where rooms.id = (storage.foldername(objects.name))[1]
        and rooms.background_owner_id = (select auth.uid())
    )
  ) with check (
    bucket_id = 'room-backgrounds'
    and objects.name = (storage.foldername(objects.name))[1] || '/background.webp'
    and exists (
      select 1 from public.rooms
      where rooms.id = (storage.foldername(objects.name))[1]
        and rooms.background_owner_id = (select auth.uid())
    )
  );

drop policy if exists "room background delete" on storage.objects;
create policy "room background delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'room-backgrounds'
    and objects.name = (storage.foldername(objects.name))[1] || '/background.webp'
    and exists (
      select 1 from public.rooms
      where rooms.id = (storage.foldername(objects.name))[1]
        and rooms.background_owner_id = (select auth.uid())
    )
  );
