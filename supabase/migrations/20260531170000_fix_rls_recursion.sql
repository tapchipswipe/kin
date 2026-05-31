-- Break infinite RLS recursion between trees <-> tree_memberships.
-- Policies that cross-reference those tables must use SECURITY DEFINER helpers
-- so lookups bypass RLS instead of re-entering policy checks.

CREATE OR REPLACE FUNCTION public.is_tree_owner(p_tree_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trees
    WHERE id = p_tree_id AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_tree_membership(
  p_tree_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tree_memberships
    WHERE tree_id = p_tree_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_tree_membership_role(
  p_tree_id uuid,
  p_roles public.collaboration_role[],
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tree_memberships
    WHERE tree_id = p_tree_id
      AND user_id = p_user_id
      AND role = ANY (p_roles)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_tree_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tree_membership(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tree_membership_role(uuid, public.collaboration_role[], uuid) TO authenticated;

-- tree_memberships: owner policy must not SELECT via trees RLS (causes recursion)
DROP POLICY IF EXISTS "Owners manage tree memberships" ON public.tree_memberships;

CREATE POLICY "Owners can view tree memberships"
  ON public.tree_memberships FOR SELECT
  USING (public.is_tree_owner(tree_id));

CREATE POLICY "Owners insert tree memberships"
  ON public.tree_memberships FOR INSERT
  WITH CHECK (public.is_tree_owner(tree_id));

CREATE POLICY "Owners update tree memberships"
  ON public.tree_memberships FOR UPDATE
  USING (public.is_tree_owner(tree_id))
  WITH CHECK (public.is_tree_owner(tree_id));

CREATE POLICY "Owners delete tree memberships"
  ON public.tree_memberships FOR DELETE
  USING (public.is_tree_owner(tree_id));

-- trees: shared-tree visibility must not query tree_memberships under RLS
DROP POLICY IF EXISTS "Members can view shared trees" ON public.trees;

CREATE POLICY "Members can view shared trees"
  ON public.trees FOR SELECT
  USING (public.has_tree_membership(id));

-- members: shared-tree read via membership helper
DROP POLICY IF EXISTS "Members readable via tree membership" ON public.members;

CREATE POLICY "Members readable via tree membership"
  ON public.members FOR SELECT
  USING (public.has_tree_membership(tree_id));

DROP POLICY IF EXISTS "Editors can update members via membership" ON public.members;

CREATE POLICY "Editors can update members via membership"
  ON public.members FOR UPDATE
  USING (public.has_tree_membership_role(tree_id, ARRAY['editor']::public.collaboration_role[]));

DROP POLICY IF EXISTS "Editors can insert members via membership" ON public.members;

CREATE POLICY "Editors can insert members via membership"
  ON public.members FOR INSERT
  WITH CHECK (public.has_tree_membership_role(tree_id, ARRAY['editor']::public.collaboration_role[]));

-- member_links
DROP POLICY IF EXISTS "Users can view links involving accessible trees" ON public.member_links;
DROP POLICY IF EXISTS "Tree participants can create member links" ON public.member_links;
DROP POLICY IF EXISTS "Link participants can update member links" ON public.member_links;

CREATE POLICY "Users can view links involving accessible trees"
  ON public.member_links FOR SELECT
  USING (
    public.is_tree_owner(tree_a_id)
    OR public.is_tree_owner(tree_b_id)
    OR public.has_tree_membership(tree_a_id)
    OR public.has_tree_membership(tree_b_id)
  );

CREATE POLICY "Tree participants can create member links"
  ON public.member_links FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.is_tree_owner(tree_a_id)
      OR public.has_tree_membership(tree_a_id)
      OR public.is_tree_owner(tree_b_id)
      OR public.has_tree_membership(tree_b_id)
    )
  );

CREATE POLICY "Link participants can update member links"
  ON public.member_links FOR UPDATE
  USING (
    auth.uid() = created_by
    OR public.is_tree_owner(tree_a_id)
    OR public.is_tree_owner(tree_b_id)
    OR public.has_tree_membership_role(tree_a_id, ARRAY['editor', 'contributor']::public.collaboration_role[])
    OR public.has_tree_membership_role(tree_b_id, ARRAY['editor', 'contributor']::public.collaboration_role[])
  );

-- suggestions
DROP POLICY IF EXISTS "Authors can create suggestions on accessible trees" ON public.suggestions;
DROP POLICY IF EXISTS "Authors and owners can view suggestions" ON public.suggestions;

CREATE POLICY "Authors can create suggestions on accessible trees"
  ON public.suggestions FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND public.has_tree_membership_role(
      tree_id,
      ARRAY['contributor', 'editor']::public.collaboration_role[]
    )
  );

CREATE POLICY "Authors and owners can view suggestions"
  ON public.suggestions FOR SELECT
  USING (
    auth.uid() = author_id
    OR public.is_tree_owner(tree_id)
    OR public.has_tree_membership(tree_id)
  );
