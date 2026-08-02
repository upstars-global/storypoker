alter table user_profiles drop constraint if exists user_profiles_avatar_url_storage;

update user_profiles
  set avatar_url = user_id::text || '/avatar.webp'
  where avatar_url is not null;

alter table user_profiles add constraint user_profiles_avatar_url_storage
  check (avatar_url is null or avatar_url = user_id::text || '/avatar.webp');

update user_profiles
  set avatar_style = 'bottts'
  where avatar_style not in ('bottts', 'dylan', 'miniavs');

alter table user_profiles drop constraint if exists user_profiles_avatar_style_allowed;
alter table user_profiles add constraint user_profiles_avatar_style_allowed
  check (avatar_style in ('bottts', 'dylan', 'miniavs'));
