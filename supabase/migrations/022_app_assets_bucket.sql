insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('app-assets', 'app-assets', true, 6291456, array['image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
