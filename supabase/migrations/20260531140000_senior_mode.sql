-- Senior-friendly mode: larger text and touch targets
alter table public.user_preferences
  add column if not exists senior_mode boolean not null default true;
