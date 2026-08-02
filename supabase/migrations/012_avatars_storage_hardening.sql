update storage.buckets
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
  where id = 'avatars';

drop policy if exists "avatar owner read" on storage.objects;
do $$ begin
  create policy "avatar owner read" on storage.objects
    for select to authenticated using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

drop policy if exists "avatar owner write" on storage.objects;
do $$ begin
  create policy "avatar owner write" on storage.objects
    for insert to authenticated with check (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

drop policy if exists "avatar owner update" on storage.objects;
do $$ begin
  create policy "avatar owner update" on storage.objects
    for update to authenticated using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    ) with check (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;

drop policy if exists "avatar owner delete" on storage.objects;
do $$ begin
  create policy "avatar owner delete" on storage.objects
    for delete to authenticated using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
exception when duplicate_object then null;
end $$;
