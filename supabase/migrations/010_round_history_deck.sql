alter table round_history
  add column if not exists active_cards text[],
  add column if not exists deck_preset text;
