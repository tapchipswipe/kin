-- Backfill rows for auth users created before the signup trigger was applied

insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);

insert into public.trees (owner_id)
select p.id
from public.profiles p
where not exists (
  select 1 from public.trees t where t.owner_id = p.id
);

insert into public.user_preferences (user_id)
select p.id
from public.profiles p
where not exists (
  select 1 from public.user_preferences up where up.user_id = p.id
);
