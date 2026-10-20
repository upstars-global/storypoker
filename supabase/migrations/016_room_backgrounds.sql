alter table rooms add column if not exists background_url text;
alter table rooms add column if not exists background_updated_at timestamptz;
alter table rooms add column if not exists background_opacity real;
alter table rooms add column if not exists background_owner_id uuid references auth.users (id) on delete set null;

alter table rooms drop constraint if exists rooms_background_opacity_range;
alter table rooms add constraint rooms_background_opacity_range
  check (background_opacity is null or background_opacity between 0.1 and 1);

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
    and exists (
      select 1 from public.rooms
      where rooms.id = (storage.foldername(name))[1]
        and rooms.background_owner_id = (select auth.uid())
    )
  );

drop policy if exists "room background update" on storage.objects;
create policy "room background update" on storage.objects
  for update to authenticated using (
    bucket_id = 'room-backgrounds'
    and name = (storage.foldername(name))[1] || '/background.webp'
    and exists (
      select 1 from public.rooms
      where rooms.id = (storage.foldername(name))[1]
        and rooms.background_owner_id = (select auth.uid())
    )
  ) with check (
    bucket_id = 'room-backgrounds'
    and name = (storage.foldername(name))[1] || '/background.webp'
    and exists (
      select 1 from public.rooms
      where rooms.id = (storage.foldername(name))[1]
        and rooms.background_owner_id = (select auth.uid())
    )
  );

drop policy if exists "room background delete" on storage.objects;
create policy "room background delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'room-backgrounds'
    and name = (storage.foldername(name))[1] || '/background.webp'
    and exists (
      select 1 from public.rooms
      where rooms.id = (storage.foldername(name))[1]
        and rooms.background_owner_id = (select auth.uid())
    )
  );

create or replace function public.guard_room_background()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.background_owner_id is not null and new.background_owner_id is distinct from (select auth.uid()) then
      raise exception 'room background owner must be the current user' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.background_owner_id is distinct from old.background_owner_id
     and not (old.background_owner_id is null and new.background_owner_id = (select auth.uid())) then
    raise exception 'room background is owned by another user' using errcode = '42501';
  end if;
  if (new.background_url, new.background_opacity) is distinct from (old.background_url, old.background_opacity)
     and new.background_owner_id is distinct from (select auth.uid()) then
    raise exception 'only the room background owner can change it' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists rooms_guard_background on rooms;
create trigger rooms_guard_background
  before insert or update on rooms
  for each row execute function public.guard_room_background();
