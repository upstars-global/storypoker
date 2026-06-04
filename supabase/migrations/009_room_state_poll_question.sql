alter table room_state
  add column if not exists poll_question text;
