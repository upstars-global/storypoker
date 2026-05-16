do $$ begin
  alter publication supabase_realtime add table players;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table room_state;
exception when duplicate_object then null;
end $$;
