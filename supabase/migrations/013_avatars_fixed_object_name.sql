drop policy if exists "avatar owner read" on storage.objects;
do $$ begin
  create policy "avatar owner read" on storage.objects
    for select to authenticated using (
      bucket_id = 'avatars'
      and name = auth.uid()::text || '/avatar.webp'
    );
exception when duplicate_object then null;
end $$;

drop policy if exists "avatar owner write" on storage.objects;
do $$ begin
  create policy "avatar owner write" on storage.objects
    for insert to authenticated with check (
      bucket_id = 'avatars'
      and name = auth.uid()::text || '/avatar.webp'
    );
exception when duplicate_object then null;
end $$;

drop policy if exists "avatar owner update" on storage.objects;
do $$ begin
  create policy "avatar owner update" on storage.objects
    for update to authenticated using (
      bucket_id = 'avatars'
      and name = auth.uid()::text || '/avatar.webp'
    ) with check (
      bucket_id = 'avatars'
      and name = auth.uid()::text || '/avatar.webp'
    );
exception when duplicate_object then null;
end $$;

drop policy if exists "avatar owner delete" on storage.objects;
do $$ begin
  create policy "avatar owner delete" on storage.objects
    for delete to authenticated using (
      bucket_id = 'avatars'
      and name = auth.uid()::text || '/avatar.webp'
    );
exception when duplicate_object then null;
end $$;
