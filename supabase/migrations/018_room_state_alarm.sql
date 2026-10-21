alter table room_state add column if not exists alarm_minutes smallint;
alter table room_state add column if not exists alarm_muted boolean;

alter table room_state drop constraint if exists room_state_alarm_minutes_range;
alter table room_state add constraint room_state_alarm_minutes_range
  check (alarm_minutes is null or alarm_minutes between 3 and 20);
