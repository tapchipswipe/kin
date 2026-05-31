-- Dual heritage: anchor member and heritage mode flag
alter table public.user_preferences
  add column if not exists anchor_member_id text,
  add column if not exists heritage_mode boolean not null default false;
