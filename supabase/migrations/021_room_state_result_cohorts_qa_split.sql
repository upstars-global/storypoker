alter table room_state drop constraint if exists room_state_result_cohorts_allowed;
alter table room_state add constraint room_state_result_cohorts_allowed
  check (result_cohorts is null or result_cohorts <@ array['DEV', 'BE', 'FE', 'SRE', 'QA', 'GQA', 'AQA']::text[]);

notify pgrst, 'reload schema';
