do $$ begin
  create policy "public update rooms" on rooms for update using (true);
exception when duplicate_object then null;
end $$;
