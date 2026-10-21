drop policy if exists "room background write" on storage.objects;
create policy "room background write" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'room-backgrounds'
    and objects.name = (storage.foldername(objects.name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(objects.name))[1])
  );

drop policy if exists "room background update" on storage.objects;
create policy "room background update" on storage.objects
  for update to authenticated using (
    bucket_id = 'room-backgrounds'
    and objects.name = (storage.foldername(objects.name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(objects.name))[1])
  ) with check (
    bucket_id = 'room-backgrounds'
    and objects.name = (storage.foldername(objects.name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(objects.name))[1])
  );

drop policy if exists "room background delete" on storage.objects;
create policy "room background delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'room-backgrounds'
    and objects.name = (storage.foldername(objects.name))[1] || '/background.webp'
    and exists (select 1 from public.rooms where rooms.id = (storage.foldername(objects.name))[1])
  );

create or replace function public.guard_room_background()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'anon' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if (new.background_owner_id, new.background_url, new.background_opacity, new.background_updated_at)
         is distinct from (null::uuid, null::text, null::real, null::timestamptz) then
      raise exception 'sign in to set the room background' using errcode = '42501';
    end if;
    return new;
  end if;
  if (new.background_owner_id, new.background_url, new.background_opacity, new.background_updated_at)
       is distinct from (old.background_owner_id, old.background_url, old.background_opacity, old.background_updated_at) then
    raise exception 'sign in to change the room background' using errcode = '42501';
  end if;
  return new;
end;
$$;
