create table rooms (
  id text primary key,
  created_at timestamptz default now()
);

create table room_state (
  room_id text primary key references rooms(id) on delete cascade,
  phase text not null default 'voting',
  active_cards text[] not null default array['0.5','1','2','3','5','8','13','21','?','Pass','☕'],
  round_started_at timestamptz default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_id text references rooms(id) on delete cascade,
  name text not null,
  is_moderator boolean not null default false,
  vote text,
  is_online boolean not null default true,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table rooms enable row level security;
alter table room_state enable row level security;
alter table players enable row level security;

create policy "public read rooms" on rooms for select using (true);
create policy "public insert rooms" on rooms for insert with check (true);

create policy "public read room_state" on room_state for select using (true);
create policy "public insert room_state" on room_state for insert with check (true);
create policy "public update room_state" on room_state for update using (true);

create policy "public read players" on players for select using (true);
create policy "public insert players" on players for insert with check (true);
create policy "public update players" on players for update using (true);
create policy "public delete players" on players for delete using (true);
