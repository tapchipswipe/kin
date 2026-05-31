-- Idempotent repair: collaboration tables, family directory, profile names, mutual collab RPCs

-- Enums
DO $$ BEGIN
  CREATE TYPE public.collaboration_role AS ENUM ('viewer', 'contributor', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'declined', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.link_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.suggestion_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.collab_request_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profile names for family directory
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text;

UPDATE public.profiles
SET
  first_name = COALESCE(
    first_name,
    NULLIF(split_part(COALESCE(display_name, ''), ' ', 1), '')
  ),
  last_name = COALESCE(
    last_name,
    NULLIF(
      CASE
        WHEN position(' ' IN COALESCE(display_name, '')) > 0
        THEN substring(COALESCE(display_name, '') FROM position(' ' IN display_name) + 1)
        ELSE ''
      END,
      ''
    )
  )
WHERE first_name IS NULL OR last_name IS NULL;

-- tree_memberships
CREATE TABLE IF NOT EXISTS public.tree_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.collaboration_role NOT NULL DEFAULT 'viewer',
  branch_root_member_id text,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tree_id, user_id)
);

CREATE INDEX IF NOT EXISTS tree_memberships_user_id_idx ON public.tree_memberships(user_id);
ALTER TABLE public.tree_memberships ENABLE ROW LEVEL SECURITY;

-- tree_invites (before policies that reference it)
CREATE TABLE IF NOT EXISTS public.tree_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitee_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  role public.collaboration_role NOT NULL DEFAULT 'viewer',
  branch_root_member_id text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status public.invite_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS tree_invites_email_idx ON public.tree_invites(lower(invitee_email));
CREATE INDEX IF NOT EXISTS tree_invites_token_idx ON public.tree_invites(token);
ALTER TABLE public.tree_invites ENABLE ROW LEVEL SECURITY;

-- member_links
CREATE TABLE IF NOT EXISTS public.member_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_a_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  member_a_id text NOT NULL,
  tree_b_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  member_b_id text NOT NULL,
  status public.link_status NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tree_a_id, member_a_id, tree_b_id, member_b_id),
  CHECK (tree_a_id <> tree_b_id)
);

ALTER TABLE public.member_links ENABLE ROW LEVEL SECURITY;

-- suggestions
CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id uuid NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  type text NOT NULL CHECK (type IN ('add_member', 'edit_member', 'add_event', 'add_media')),
  status public.suggestion_status NOT NULL DEFAULT 'pending',
  member_id text,
  description text NOT NULL DEFAULT '',
  suggested_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suggestions_tree_id_idx ON public.suggestions(tree_id);
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Family directory collab requests
CREATE TABLE IF NOT EXISTS public.collab_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.collab_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> target_user_id)
);

CREATE INDEX IF NOT EXISTS collab_requests_requester_idx ON public.collab_requests(requester_id);
CREATE INDEX IF NOT EXISTS collab_requests_target_idx ON public.collab_requests(target_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS collab_requests_pending_pair_idx
  ON public.collab_requests(requester_id, target_user_id)
  WHERE status = 'pending';

ALTER TABLE public.collab_requests ENABLE ROW LEVEL SECURITY;

-- Drop broken policies if re-running, then recreate
DROP POLICY IF EXISTS "Owners manage tree memberships" ON public.tree_memberships;
DROP POLICY IF EXISTS "Members can view own memberships" ON public.tree_memberships;
DROP POLICY IF EXISTS "Invitees can join via accepted invite" ON public.tree_memberships;
DROP POLICY IF EXISTS "Membership via collab accept" ON public.tree_memberships;

CREATE POLICY "Owners manage tree memberships"
  ON public.tree_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trees
      WHERE trees.id = tree_memberships.tree_id AND trees.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trees
      WHERE trees.id = tree_memberships.tree_id AND trees.owner_id = auth.uid()
    )
  );

CREATE POLICY "Members can view own memberships"
  ON public.tree_memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Invitees can join via accepted invite"
  ON public.tree_memberships FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tree_invites ti
      WHERE ti.tree_id = tree_memberships.tree_id
        AND ti.status = 'pending'
        AND (
          ti.invitee_user_id = auth.uid()
          OR lower(ti.invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
        )
    )
  );

DROP POLICY IF EXISTS "Owners manage tree invites" ON public.tree_invites;
DROP POLICY IF EXISTS "Invitees can view invites for their email" ON public.tree_invites;
DROP POLICY IF EXISTS "Invitees can accept invites" ON public.tree_invites;

CREATE POLICY "Owners manage tree invites"
  ON public.tree_invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trees
      WHERE trees.id = tree_invites.tree_id AND trees.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trees
      WHERE trees.id = tree_invites.tree_id AND trees.owner_id = auth.uid()
    )
  );

CREATE POLICY "Invitees can view invites for their email"
  ON public.tree_invites FOR SELECT
  USING (
    invitee_user_id = auth.uid()
    OR lower(invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

CREATE POLICY "Invitees can accept invites"
  ON public.tree_invites FOR UPDATE
  USING (
    invitee_user_id = auth.uid()
    OR lower(invitee_email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

DROP POLICY IF EXISTS "Users can view links involving accessible trees" ON public.member_links;
DROP POLICY IF EXISTS "Tree participants can create member links" ON public.member_links;
DROP POLICY IF EXISTS "Tree owners can update member links" ON public.member_links;
DROP POLICY IF EXISTS "Link participants can update member links" ON public.member_links;

CREATE POLICY "Users can view links involving accessible trees"
  ON public.member_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trees t
      WHERE (t.id = member_links.tree_a_id OR t.id = member_links.tree_b_id)
        AND (
          t.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tree_memberships tm
            WHERE tm.tree_id = t.id AND tm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Tree participants can create member links"
  ON public.member_links FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      EXISTS (SELECT 1 FROM public.trees WHERE id = tree_a_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.tree_memberships WHERE tree_id = tree_a_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.trees WHERE id = tree_b_id AND owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.tree_memberships WHERE tree_id = tree_b_id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Link participants can update member links"
  ON public.member_links FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.trees t
      WHERE (t.id = member_links.tree_a_id OR t.id = member_links.tree_b_id)
        AND t.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.tree_memberships tm
      JOIN public.trees t ON t.id = tm.tree_id
      WHERE tm.user_id = auth.uid()
        AND (t.id = member_links.tree_a_id OR t.id = member_links.tree_b_id)
        AND tm.role IN ('editor', 'contributor')
    )
  );

DROP POLICY IF EXISTS "Tree owners manage suggestions" ON public.suggestions;
DROP POLICY IF EXISTS "Authors can create suggestions on accessible trees" ON public.suggestions;
DROP POLICY IF EXISTS "Authors and owners can view suggestions" ON public.suggestions;

CREATE POLICY "Tree owners manage suggestions"
  ON public.suggestions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trees
      WHERE trees.id = suggestions.tree_id AND trees.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trees
      WHERE trees.id = suggestions.tree_id AND trees.owner_id = auth.uid()
    )
  );

CREATE POLICY "Authors can create suggestions on accessible trees"
  ON public.suggestions FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.tree_memberships tm
      WHERE tm.tree_id = suggestions.tree_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('contributor', 'editor')
    )
  );

CREATE POLICY "Authors and owners can view suggestions"
  ON public.suggestions FOR SELECT
  USING (
    auth.uid() = author_id
    OR EXISTS (
      SELECT 1 FROM public.trees
      WHERE trees.id = suggestions.tree_id AND trees.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.tree_memberships tm
      WHERE tm.tree_id = suggestions.tree_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members readable via tree membership" ON public.members;
DROP POLICY IF EXISTS "Editors can update members via membership" ON public.members;
DROP POLICY IF EXISTS "Editors can insert members via membership" ON public.members;
DROP POLICY IF EXISTS "Members can view shared trees" ON public.trees;
DROP POLICY IF EXISTS "Users can view profiles of collaborators" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can browse family directory" ON public.profiles;

CREATE POLICY "Members readable via tree membership"
  ON public.members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tree_memberships tm
      WHERE tm.tree_id = members.tree_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can update members via membership"
  ON public.members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tree_memberships tm
      WHERE tm.tree_id = members.tree_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'editor'
    )
  );

CREATE POLICY "Editors can insert members via membership"
  ON public.members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tree_memberships tm
      WHERE tm.tree_id = members.tree_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'editor'
    )
  );

CREATE POLICY "Members can view shared trees"
  ON public.trees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tree_memberships tm
      WHERE tm.tree_id = trees.id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view profiles of collaborators"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.tree_memberships tm
      JOIN public.trees t ON t.id = tm.tree_id
      WHERE tm.user_id = auth.uid() AND t.owner_id = profiles.id
    )
    OR EXISTS (
      SELECT 1 FROM public.tree_memberships tm
      JOIN public.trees t ON t.id = tm.tree_id
      WHERE t.owner_id = auth.uid() AND tm.user_id = profiles.id
    )
  );

CREATE POLICY "Authenticated users can browse family directory"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view collab requests involving them" ON public.collab_requests;
DROP POLICY IF EXISTS "Users can create collab requests" ON public.collab_requests;
DROP POLICY IF EXISTS "Users can update collab requests involving them" ON public.collab_requests;

CREATE POLICY "Users can view collab requests involving them"
  ON public.collab_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can create collab requests"
  ON public.collab_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update collab requests involving them"
  ON public.collab_requests FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = target_user_id);

-- Helper: primary tree for a user
CREATE OR REPLACE FUNCTION public.get_user_tree_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.trees
  WHERE owner_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- Accept collab request: mutual viewer memberships
CREATE OR REPLACE FUNCTION public.accept_collab_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.collab_requests%ROWTYPE;
  v_requester_tree uuid;
  v_target_tree uuid;
BEGIN
  SELECT * INTO v_request
  FROM public.collab_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already handled';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> v_request.target_user_id THEN
    RAISE EXCEPTION 'Only the recipient can accept this request';
  END IF;

  v_requester_tree := public.get_user_tree_id(v_request.requester_id);
  v_target_tree := public.get_user_tree_id(v_request.target_user_id);

  IF v_requester_tree IS NULL OR v_target_tree IS NULL THEN
    RAISE EXCEPTION 'Both users need a family tree before connecting';
  END IF;

  INSERT INTO public.tree_memberships (tree_id, user_id, role, invited_by)
  VALUES (v_target_tree, v_request.requester_id, 'viewer', v_request.target_user_id)
  ON CONFLICT (tree_id, user_id) DO NOTHING;

  INSERT INTO public.tree_memberships (tree_id, user_id, role, invited_by)
  VALUES (v_requester_tree, v_request.target_user_id, 'viewer', v_request.requester_id)
  ON CONFLICT (tree_id, user_id) DO NOTHING;

  UPDATE public.collab_requests
  SET status = 'accepted'
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_collab_request(uuid) TO authenticated;

-- Disconnect mutual collab between two users
CREATE OR REPLACE FUNCTION public.disconnect_collab(p_other_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_tree uuid;
  v_other_tree uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_my_tree := public.get_user_tree_id(auth.uid());
  v_other_tree := public.get_user_tree_id(p_other_user_id);

  IF v_my_tree IS NOT NULL AND v_other_tree IS NOT NULL THEN
    DELETE FROM public.tree_memberships
    WHERE (tree_id = v_other_tree AND user_id = auth.uid())
       OR (tree_id = v_my_tree AND user_id = p_other_user_id);
  END IF;

  UPDATE public.collab_requests
  SET status = 'cancelled'
  WHERE status = 'pending'
    AND (
      (requester_id = auth.uid() AND target_user_id = p_other_user_id)
      OR (requester_id = p_other_user_id AND target_user_id = auth.uid())
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.disconnect_collab(uuid) TO authenticated;
