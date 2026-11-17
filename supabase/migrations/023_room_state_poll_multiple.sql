alter table room_state add column if not exists poll_multiple boolean not null default false;
