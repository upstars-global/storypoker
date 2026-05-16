alter table room_state
  add column if not exists paused_at timestamptz,
  add column if not exists paused_elapsed_ms bigint not null default 0;
