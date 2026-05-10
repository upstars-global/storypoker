create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  avatar_style text not null default 'bottts',
  avatar_seed text not null,
  updated_at timestamptz default now()
);

alter table user_profiles enable row level security;

do $$ begin
  create policy "public read user_profiles" on user_profiles for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "public insert user_profiles" on user_profiles for insert with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "public update user_profiles" on user_profiles for update using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table user_profiles;
exception when duplicate_object then null;
end $$;
