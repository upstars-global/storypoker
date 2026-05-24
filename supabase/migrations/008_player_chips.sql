alter table players add column if not exists chips text[] not null default '{}';

update players
set name = regexp_replace(name, '^\[(DEV|QA|BE|FE|SV|SM)\]\s+', '')
where name ~ '^\[(DEV|QA|BE|FE|SV|SM)\]\s+';
