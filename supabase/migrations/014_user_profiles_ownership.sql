drop policy if exists "public insert user_profiles" on user_profiles;
drop policy if exists "public update user_profiles" on user_profiles;

do $$ begin
  create policy "owner insert user_profiles" on user_profiles
    for insert to authenticated with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "owner update user_profiles" on user_profiles
    for update to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

update user_profiles set avatar_style = 'bottts' where avatar_style = 'custom';

alter table user_profiles drop constraint if exists user_profiles_avatar_url_storage;
alter table user_profiles add constraint user_profiles_avatar_url_storage
  check (
    avatar_url is null
    or avatar_url ~ '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/avatars/'
  );
