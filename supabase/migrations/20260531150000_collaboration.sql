-- Collaboration: shared tree access, member links, invites, suggestions

-- Roles: viewer (read in hub), contributor (suggest), editor (direct edit on branch)
create type public.collaboration_role as enum ('viewer', 'contributor', 'editor');

create type public.invite_status as enum ('pending', 'accepted', 'declined', 'revoked');

create type public.link_status as enum ('pending', 'accepted', 'rejected');

create type public.suggestion_status as enum ('pending', 'approved', 'rejected');

-- Active memberships: user granted access to a tree
create table public.tree_memberships (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.collaboration_role not null default 'viewer',
  branch_root_member_id text,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tree_id, user_id)
);

create index tree_memberships_user_id_idx on public.tree_memberships(user_id);

alter table public.tree_memberships enable row level security;

-- Tree owner manages memberships; members can view their own
create policy "Owners manage tree memberships"
  on public.tree_memberships for all
  using (
    exists (
      select 1 from public.trees
      where trees.id = tree_memberships.tree_id
        and trees.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trees
      where trees.id = tree_memberships.tree_id
        and trees.owner_id = auth.uid()
    )
  );

create policy "Members can view own memberships"
  on public.tree_memberships for select
  using (auth.uid() = user_id);

create policy "Invitees can join via accepted invite"
  on public.tree_memberships for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tree_invites ti
      where ti.tree_id = tree_memberships.tree_id
        and ti.status = 'pending'
        and (
          ti.invitee_user_id = auth.uid()
          or lower(ti.invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
        )
    )
  );

-- Pending invites by email (before user accepts)
create table public.tree_invites (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  invitee_email text not null,
  invitee_user_id uuid references public.profiles(id) on delete set null,
  role public.collaboration_role not null default 'viewer',
  branch_root_member_id text,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status public.invite_status not null default 'pending',
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index tree_invites_email_idx on public.tree_invites(lower(invitee_email));
create index tree_invites_token_idx on public.tree_invites(token);

alter table public.tree_invites enable row level security;

create policy "Owners manage tree invites"
  on public.tree_invites for all
  using (
    exists (
      select 1 from public.trees
      where trees.id = tree_invites.tree_id
        and trees.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trees
      where trees.id = tree_invites.tree_id
        and trees.owner_id = auth.uid()
    )
  );

create policy "Invitees can view invites for their email"
  on public.tree_invites for select
  using (
    invitee_user_id = auth.uid()
    or lower(invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

create policy "Invitees can accept invites"
  on public.tree_invites for update
  using (
    invitee_user_id = auth.uid()
    or lower(invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

-- Link same person across two trees (junction points for merge)
create table public.member_links (
  id uuid primary key default gen_random_uuid(),
  tree_a_id uuid not null references public.trees(id) on delete cascade,
  member_a_id text not null,
  tree_b_id uuid not null references public.trees(id) on delete cascade,
  member_b_id text not null,
  status public.link_status not null default 'pending',
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tree_a_id, member_a_id, tree_b_id, member_b_id),
  check (tree_a_id <> tree_b_id)
);

alter table public.member_links enable row level security;

create policy "Users can view links involving accessible trees"
  on public.member_links for select
  using (
    exists (
      select 1 from public.trees t
      where (t.id = member_links.tree_a_id or t.id = member_links.tree_b_id)
        and (
          t.owner_id = auth.uid()
          or exists (
            select 1 from public.tree_memberships tm
            where tm.tree_id = t.id and tm.user_id = auth.uid()
          )
        )
    )
  );

create policy "Tree participants can create member links"
  on public.member_links for insert
  with check (
    auth.uid() = created_by
    and (
      exists (select 1 from public.trees where id = tree_a_id and owner_id = auth.uid())
      or exists (select 1 from public.tree_memberships where tree_id = tree_a_id and user_id = auth.uid())
      or exists (select 1 from public.trees where id = tree_b_id and owner_id = auth.uid())
      or exists (select 1 from public.tree_memberships where tree_id = tree_b_id and user_id = auth.uid())
    )
  );

create policy "Tree owners can update member links"
  on public.member_links for update
  using (
    exists (
      select 1 from public.trees t
      where (t.id = member_links.tree_a_id or t.id = member_links.tree_b_id)
        and t.owner_id = auth.uid()
    )
    or auth.uid() = created_by
  );

-- Suggestions from contributors
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  type text not null check (type in ('add_member', 'edit_member', 'add_event', 'add_media')),
  status public.suggestion_status not null default 'pending',
  member_id text,
  description text not null default '',
  suggested_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index suggestions_tree_id_idx on public.suggestions(tree_id);

alter table public.suggestions enable row level security;

create policy "Tree owners manage suggestions"
  on public.suggestions for all
  using (
    exists (
      select 1 from public.trees
      where trees.id = suggestions.tree_id
        and trees.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.trees
      where trees.id = suggestions.tree_id
        and trees.owner_id = auth.uid()
    )
  );

create policy "Authors can create suggestions on accessible trees"
  on public.suggestions for insert
  with check (
    auth.uid() = author_id
    and (
      exists (
        select 1 from public.tree_memberships tm
        where tm.tree_id = suggestions.tree_id
          and tm.user_id = auth.uid()
          and tm.role in ('contributor', 'editor')
      )
    )
  );

create policy "Authors and owners can view suggestions"
  on public.suggestions for select
  using (
    auth.uid() = author_id
    or exists (
      select 1 from public.trees
      where trees.id = suggestions.tree_id
        and trees.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.tree_memberships tm
      where tm.tree_id = suggestions.tree_id and tm.user_id = auth.uid()
    )
  );

-- Extend RLS: members readable when user has tree membership
create policy "Members readable via tree membership"
  on public.members for select
  using (
    exists (
      select 1 from public.tree_memberships tm
      where tm.tree_id = members.tree_id
        and tm.user_id = auth.uid()
    )
  );

-- Editors can update members on trees they edit
create policy "Editors can update members via membership"
  on public.members for update
  using (
    exists (
      select 1 from public.tree_memberships tm
      where tm.tree_id = members.tree_id
        and tm.user_id = auth.uid()
        and tm.role = 'editor'
    )
  );

create policy "Editors can insert members via membership"
  on public.members for insert
  with check (
    exists (
      select 1 from public.tree_memberships tm
      where tm.tree_id = members.tree_id
        and tm.user_id = auth.uid()
        and tm.role = 'editor'
    )
  );

-- Shared trees visible to members
create policy "Members can view shared trees"
  on public.trees for select
  using (
    exists (
      select 1 from public.tree_memberships tm
      where tm.tree_id = trees.id
        and tm.user_id = auth.uid()
    )
  );

-- Allow viewing profiles of tree owners you collaborate with
create policy "Users can view profiles of collaborators"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.tree_memberships tm
      join public.trees t on t.id = tm.tree_id
      where tm.user_id = auth.uid()
        and t.owner_id = profiles.id
    )
    or exists (
      select 1 from public.tree_memberships tm
      join public.trees t on t.id = tm.tree_id
      where t.owner_id = auth.uid()
        and tm.user_id = profiles.id
    )
  );
