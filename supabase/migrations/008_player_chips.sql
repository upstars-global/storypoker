alter table players add column if not exists chips text[] not null default '{}';
