-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- One tree per user for v1
create table public.trees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text default 'My Family Tree' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.trees enable row level security;

create policy "Users can view own trees"
  on public.trees for select
  using (auth.uid() = owner_id);

create policy "Users can insert own trees"
  on public.trees for insert
  with check (auth.uid() = owner_id);

create policy "Users can update own trees"
  on public.trees for update
  using (auth.uid() = owner_id);

create policy "Users can delete own trees"
  on public.trees for delete
  using (auth.uid() = owner_id);

-- Family members stored as JSONB
create table public.members (
  tree_id uuid not null references public.trees(id) on delete cascade,
  id text not null,
  data jsonb not null,
  primary key (tree_id, id)
);

alter table public.members enable row level security;

create policy "Users can view members in own trees"
  on public.members for select
  using (
    exists (
      select 1 from public.trees
      where trees.id = members.tree_id
        and trees.owner_id = auth.uid()
    )
  );

create policy "Users can insert members in own trees"
  on public.members for insert
  with check (
    exists (
      select 1 from public.trees
      where trees.id = members.tree_id
        and trees.owner_id = auth.uid()
    )
  );

create policy "Users can update members in own trees"
  on public.members for update
  using (
    exists (
      select 1 from public.trees
      where trees.id = members.tree_id
        and trees.owner_id = auth.uid()
    )
  );

create policy "Users can delete members in own trees"
  on public.members for delete
  using (
    exists (
      select 1 from public.trees
      where trees.id = members.tree_id
        and trees.owner_id = auth.uid()
    )
  );

-- User preferences
create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  recently_visited text[] default '{}' not null,
  blueprint_layout text default 'hierarchical',
  geocode_cache jsonb default '{}' not null
);

alter table public.user_preferences enable row level security;

create policy "Users can view own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

-- Auto-create profile, tree, and preferences on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.trees (owner_id)
  values (new.id);

  insert into public.user_preferences (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for media files
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Users can upload own media"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own media"
  on storage.objects for update
  using (
    bucket_id = 'media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own media"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public read access for media"
  on storage.objects for select
  using (bucket_id = 'media');
