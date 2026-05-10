do $$ begin
  alter publication supabase_realtime add table rooms;
exception when duplicate_object then null;
end $$;
