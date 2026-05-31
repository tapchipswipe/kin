/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AccessibleTree,
  CollabRequest,
  CollaborationRole,
  FamilyDirectoryEntry,
  FamilyMember,
  MemberLink,
  ProposedSuggestion,
  TreeInvite,
} from '../types';
import { normalizeFamilyMembers } from './importFamilyJson';
import { saveMembers } from './lineageDb';
import { supabase } from './supabase';

function errMsg(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: string }).message);
    if (message.includes('Could not find the table') || message.includes('schema cache')) {
      return 'Collaboration is not set up yet. Run supabase/migrations/20260531160000_fix_collaboration.sql in your Supabase SQL editor, then refresh.';
    }
    return message;
  }
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

export function isCollaborationSchemaError(error: unknown): boolean {
  const msg = errMsg(error);
  return msg.includes('schema cache') || msg.includes('Could not find the table') || msg.includes('Collaboration is not set up');
}

function formatProfileName(row: {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
}): string {
  const first = row.first_name?.trim();
  const last = row.last_name?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return row.display_name?.trim() || 'Family member';
}

async function profileName(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name, display_name')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return 'Family member';
  return formatProfileName(data);
}

export async function loadAccessibleTrees(
  userId: string,
  ownTreeId: string,
  ownMembers: FamilyMember[],
  ownTreeName = 'My Family Tree'
): Promise<AccessibleTree[]> {
  const own: AccessibleTree = {
    treeId: ownTreeId,
    name: ownTreeName,
    ownerId: userId,
    ownerName: 'You',
    role: 'owner',
    members: normalizeFamilyMembers(ownMembers),
    isOwnTree: true,
  };

  const { data: memberships, error } = await supabase
    .from('tree_memberships')
    .select('tree_id, role, trees(id, name, owner_id)')
    .eq('user_id', userId);

  if (error) throw new Error(errMsg(error));

  const shared: AccessibleTree[] = [];
  for (const row of memberships ?? []) {
    const tree = row.trees as { id: string; name: string; owner_id: string } | null;
    if (!tree || tree.id === ownTreeId) continue;

    const [membersResult, ownerName] = await Promise.all([
      supabase.from('members').select('id, data').eq('tree_id', tree.id),
      profileName(tree.owner_id),
    ]);

    if (membersResult.error) throw new Error(errMsg(membersResult.error));

    shared.push({
      treeId: tree.id,
      name: tree.name,
      ownerId: tree.owner_id,
      ownerName,
      role: row.role as CollaborationRole,
      members: normalizeFamilyMembers(
        (membersResult.data ?? []).map((m) => m.data as FamilyMember)
      ),
      isOwnTree: false,
    });
  }

  return [own, ...shared];
}

export async function loadOutgoingInvites(treeId: string): Promise<TreeInvite[]> {
  const { data, error } = await supabase
    .from('tree_invites')
    .select('id, tree_id, invitee_email, role, token, status, created_at, trees(name)')
    .eq('tree_id', treeId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(errMsg(error));

  return (data ?? []).map((row) => ({
    id: row.id,
    treeId: row.tree_id,
    treeName: (row.trees as { name: string } | null)?.name ?? 'Family tree',
    inviteeEmail: row.invitee_email,
    role: row.role as CollaborationRole,
    token: row.token,
    status: row.status,
    invitedByName: 'You',
    createdAt: row.created_at,
  }));
}

export async function loadIncomingInvites(userEmail: string): Promise<TreeInvite[]> {
  const { data, error } = await supabase
    .from('tree_invites')
    .select('id, tree_id, invitee_email, role, token, status, created_at, invited_by, trees(name)')
    .eq('status', 'pending')
    .ilike('invitee_email', userEmail);

  if (error) throw new Error(errMsg(error));

  const inviterIds = [...new Set((data ?? []).map((row) => row.invited_by as string))];
  const nameMap = new Map<string, string>();
  if (inviterIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', inviterIds);
    for (const p of profiles ?? []) {
      nameMap.set(p.id, p.display_name || 'Someone');
    }
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    treeId: row.tree_id,
    treeName: (row.trees as { name: string } | null)?.name ?? 'Family tree',
    inviteeEmail: row.invitee_email,
    role: row.role as CollaborationRole,
    token: row.token,
    status: row.status,
    invitedByName: nameMap.get(row.invited_by as string) ?? 'Someone',
    createdAt: row.created_at,
  }));
}

export async function createTreeInvite(
  treeId: string,
  inviteeEmail: string,
  role: CollaborationRole,
  branchRootMemberId?: string
): Promise<{ token: string; inviteUrl: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const invitedBy = userData.user?.id;
  if (!invitedBy) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('tree_invites')
    .insert({
      tree_id: treeId,
      invitee_email: inviteeEmail.trim().toLowerCase(),
      role,
      branch_root_member_id: branchRootMemberId ?? null,
      invited_by: invitedBy,
    })
    .select('token')
    .single();

  if (error) throw new Error(errMsg(error));

  const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${data.token}`;
  return { token: data.token, inviteUrl };
}

export async function acceptTreeInvite(inviteId: string, userId: string): Promise<void> {
  const { data: invite, error: fetchError } = await supabase
    .from('tree_invites')
    .select('tree_id, role, branch_root_member_id')
    .eq('id', inviteId)
    .single();

  if (fetchError) throw new Error(errMsg(fetchError));

  const { error: membershipError } = await supabase.from('tree_memberships').insert({
    tree_id: invite.tree_id,
    user_id: userId,
    role: invite.role,
    branch_root_member_id: invite.branch_root_member_id,
  });

  if (membershipError) throw new Error(errMsg(membershipError));

  const { error: updateError } = await supabase
    .from('tree_invites')
    .update({ status: 'accepted', invitee_user_id: userId })
    .eq('id', inviteId);

  if (updateError) throw new Error(errMsg(updateError));
}

export async function declineTreeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('tree_invites')
    .update({ status: 'declined' })
    .eq('id', inviteId);
  if (error) throw new Error(errMsg(error));
}

export async function revokeTreeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('tree_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId);
  if (error) throw new Error(errMsg(error));
}

export async function revokeMembership(membershipTreeId: string, memberUserId: string): Promise<void> {
  const { error } = await supabase
    .from('tree_memberships')
    .delete()
    .eq('tree_id', membershipTreeId)
    .eq('user_id', memberUserId);
  if (error) throw new Error(errMsg(error));
}

export async function loadMemberLinks(userId: string): Promise<MemberLink[]> {
  const { data, error } = await supabase
    .from('member_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(errMsg(error));

  return (data ?? []).map((row) => ({
    id: row.id,
    treeAId: row.tree_a_id,
    memberAId: row.member_a_id,
    treeBId: row.tree_b_id,
    memberBId: row.member_b_id,
    status: row.status,
    createdBy: row.created_by,
  }));
}

export async function createMemberLink(
  treeAId: string,
  memberAId: string,
  treeBId: string,
  memberBId: string
): Promise<MemberLink> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('member_links')
    .insert({
      tree_a_id: treeAId,
      member_a_id: memberAId,
      tree_b_id: treeBId,
      member_b_id: memberBId,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw new Error(errMsg(error));

  return {
    id: data.id,
    treeAId: data.tree_a_id,
    memberAId: data.member_a_id,
    treeBId: data.tree_b_id,
    memberBId: data.member_b_id,
    status: data.status,
    createdBy: data.created_by,
  };
}

export async function updateMemberLinkStatus(
  linkId: string,
  status: 'accepted' | 'rejected'
): Promise<void> {
  const { error } = await supabase.from('member_links').update({ status }).eq('id', linkId);
  if (error) throw new Error(errMsg(error));
}

function mapSuggestion(row: Record<string, unknown>): ProposedSuggestion {
  return {
    id: row.id as string,
    treeId: row.tree_id as string,
    type: row.type as ProposedSuggestion['type'],
    status: row.status as ProposedSuggestion['status'],
    author: row.author_name as string,
    timestamp: row.created_at as string,
    memberId: (row.member_id as string) || undefined,
    description: (row.description as string) || '',
    suggestedData: (row.suggested_data as ProposedSuggestion['suggestedData']) ?? {},
  };
}

export async function loadSuggestionsForTrees(treeIds: string[]): Promise<ProposedSuggestion[]> {
  if (treeIds.length === 0) return [];

  const { data, error } = await supabase
    .from('suggestions')
    .select('*')
    .in('tree_id', treeIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(errMsg(error));
  return (data ?? []).map(mapSuggestion);
}

export async function createSuggestion(
  treeId: string,
  authorName: string,
  suggestion: Omit<ProposedSuggestion, 'id' | 'status' | 'author' | 'timestamp' | 'treeId'>
): Promise<ProposedSuggestion> {
  const { data: userData } = await supabase.auth.getUser();
  const authorId = userData.user?.id;
  if (!authorId) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('suggestions')
    .insert({
      tree_id: treeId,
      author_id: authorId,
      author_name: authorName,
      type: suggestion.type,
      member_id: suggestion.memberId ?? null,
      description: suggestion.description,
      suggested_data: suggestion.suggestedData,
    })
    .select('*')
    .single();

  if (error) throw new Error(errMsg(error));
  return mapSuggestion(data);
}

export async function updateSuggestionStatus(
  suggestionId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const { error } = await supabase.from('suggestions').update({ status }).eq('id', suggestionId);
  if (error) throw new Error(errMsg(error));
}

export async function applyApprovedSuggestion(
  suggestion: ProposedSuggestion,
  currentMembers: FamilyMember[]
): Promise<FamilyMember[]> {
  const members = currentMembers.map((m) => ({ ...m }));

  if (suggestion.type === 'add_member' && suggestion.suggestedData.member) {
    const newMember = suggestion.suggestedData.member as FamilyMember;
    if (!newMember.id) {
      newMember.id = `m_${Date.now()}`;
    }
    members.push(newMember);
    return members;
  }

  if (suggestion.type === 'edit_member' && suggestion.memberId && suggestion.suggestedData.member) {
    const idx = members.findIndex((m) => m.id === suggestion.memberId);
    if (idx >= 0) {
      members[idx] = { ...members[idx], ...suggestion.suggestedData.member };
    }
    return members;
  }

  if (suggestion.type === 'add_event' && suggestion.memberId && suggestion.suggestedData.event) {
    const idx = members.findIndex((m) => m.id === suggestion.memberId);
    if (idx >= 0) {
      const events = [...(members[idx].timelineEvents || [])];
      events.push(suggestion.suggestedData.event);
      members[idx] = { ...members[idx], timelineEvents: events };
    }
    return members;
  }

  if (suggestion.type === 'add_media' && suggestion.memberId && suggestion.suggestedData.media) {
    const idx = members.findIndex((m) => m.id === suggestion.memberId);
    if (idx >= 0) {
      const media = [...(members[idx].mediaAttachments || [])];
      media.push(suggestion.suggestedData.media);
      members[idx] = { ...members[idx], mediaAttachments: media };
    }
    return members;
  }

  return members;
}

export async function approveAndApplySuggestion(
  suggestion: ProposedSuggestion,
  loadMembers: (treeId: string) => Promise<FamilyMember[]>
): Promise<void> {
  if (!suggestion.treeId) throw new Error('Suggestion missing tree');

  const members = await loadMembers(suggestion.treeId);
  const updated = await applyApprovedSuggestion(suggestion, members);
  await saveMembers(suggestion.treeId, updated);
  await updateSuggestionStatus(suggestion.id, 'approved');
}

async function loadTreeMembers(treeId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase.from('members').select('id, data').eq('tree_id', treeId);
  if (error) throw new Error(errMsg(error));
  return (data ?? []).map((row) => row.data as FamilyMember);
}

export async function approveSuggestionById(
  suggestion: ProposedSuggestion
): Promise<void> {
  await approveAndApplySuggestion(suggestion, loadTreeMembers);
}

/** Suggest link points when names and birth years match across trees. */
export function suggestLinkCandidates(
  trees: AccessibleTree[]
): { treeAId: string; memberAId: string; memberBId: string; treeBId: string; score: number; label: string }[] {
  const candidates: {
    treeAId: string;
    memberAId: string;
    memberBId: string;
    treeBId: string;
    score: number;
    label: string;
  }[] = [];

  for (let i = 0; i < trees.length; i++) {
    for (let j = i + 1; j < trees.length; j++) {
      const treeA = trees[i];
      const treeB = trees[j];
      for (const ma of treeA.members) {
        for (const mb of treeB.members) {
          const firstA = `${ma.firstName ?? ''}`.trim().toLowerCase();
          const firstB = `${mb.firstName ?? ''}`.trim().toLowerCase();
          const lastA = `${ma.lastName ?? ''}`.trim().toLowerCase();
          const lastB = `${mb.lastName ?? ''}`.trim().toLowerCase();
          if (!firstA || !firstB || !lastA || !lastB) continue;
          if (firstA !== firstB || lastA !== lastB) continue;

          const yearA = ma.birthDate?.slice(0, 4);
          const yearB = mb.birthDate?.slice(0, 4);
          const yearMatch = yearA && yearB && yearA === yearB;
          const score = yearMatch ? 2 : 1;

          candidates.push({
            treeAId: treeA.treeId,
            memberAId: ma.id,
            treeBId: treeB.treeId,
            memberBId: mb.id,
            score,
            label: `${ma.firstName} ${ma.lastName}${yearA ? ` (${yearA})` : ''}`,
          });
        }
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export async function acceptInviteByToken(token: string, userId: string): Promise<void> {
  const { data: invite, error } = await supabase
    .from('tree_invites')
    .select('id')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle();

  if (error) throw new Error(errMsg(error));
  if (!invite) throw new Error('Invite not found or expired');
  await acceptTreeInvite(invite.id, userId);
}

export async function loadFamilyDirectory(userId: string): Promise<FamilyDirectoryEntry[]> {
  const [profilesResult, requestsResult, membershipsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name')
      .neq('id', userId)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true }),
    supabase
      .from('collab_requests')
      .select('id, requester_id, target_user_id, status')
      .or(`requester_id.eq.${userId},target_user_id.eq.${userId}`)
      .in('status', ['pending', 'accepted']),
    supabase
      .from('tree_memberships')
      .select('trees(owner_id)')
      .eq('user_id', userId),
  ]);

  if (profilesResult.error) throw new Error(errMsg(profilesResult.error));
  if (requestsResult.error) throw new Error(errMsg(requestsResult.error));
  if (membershipsResult.error) throw new Error(errMsg(membershipsResult.error));

  const connectedOwnerIds = new Set<string>();
  for (const row of membershipsResult.data ?? []) {
    const ownerId = (row.trees as { owner_id: string } | null)?.owner_id;
    if (ownerId) connectedOwnerIds.add(ownerId);
  }

  const pendingByUser = new Map<string, { id: string; direction: 'out' | 'in' }>();
  for (const req of requestsResult.data ?? []) {
    if (req.status !== 'pending') continue;
    if (req.requester_id === userId) {
      pendingByUser.set(req.target_user_id, { id: req.id, direction: 'out' });
    } else if (req.target_user_id === userId) {
      pendingByUser.set(req.requester_id, { id: req.id, direction: 'in' });
    }
  }

  return (profilesResult.data ?? []).map((p) => {
    let connectionStatus: FamilyDirectoryEntry['connectionStatus'] = 'none';
    let requestId: string | undefined;

    if (connectedOwnerIds.has(p.id)) {
      connectionStatus = 'connected';
    } else {
      const pending = pendingByUser.get(p.id);
      if (pending) {
        connectionStatus = pending.direction === 'out' ? 'pending_out' : 'pending_in';
        requestId = pending.id;
      }
    }

    const firstName = p.first_name?.trim() || p.display_name?.split(' ')[0] || 'Family';
    const lastName =
      p.last_name?.trim() ||
      (p.display_name?.includes(' ')
        ? p.display_name.slice(p.display_name.indexOf(' ') + 1)
        : 'Member');

    return {
      userId: p.id,
      firstName,
      lastName,
      connectionStatus,
      requestId,
    };
  });
}

export async function loadIncomingCollabRequests(userId: string): Promise<CollabRequest[]> {
  const { data, error } = await supabase
    .from('collab_requests')
    .select('id, requester_id, target_user_id, status, created_at')
    .eq('target_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(errMsg(error));

  const requesterIds = [...new Set((data ?? []).map((r) => r.requester_id))];
  const nameMap = new Map<string, { first: string; last: string }>();

  if (requesterIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, display_name')
      .in('id', requesterIds);
    for (const p of profiles ?? []) {
      nameMap.set(p.id, {
        first: p.first_name?.trim() || p.display_name?.split(' ')[0] || 'Someone',
        last:
          p.last_name?.trim() ||
          (p.display_name?.includes(' ')
            ? p.display_name.slice(p.display_name.indexOf(' ') + 1)
            : ''),
      });
    }
  }

  return (data ?? []).map((row) => {
    const names = nameMap.get(row.requester_id);
    return {
      id: row.id,
      requesterId: row.requester_id,
      requesterFirstName: names?.first ?? 'Someone',
      requesterLastName: names?.last ?? '',
      targetUserId: row.target_user_id,
      status: row.status,
      createdAt: row.created_at,
    };
  });
}

export async function sendCollabRequest(targetUserId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const requesterId = userData.user?.id;
  if (!requesterId) throw new Error('Not signed in');
  if (requesterId === targetUserId) throw new Error('Cannot connect with yourself');

  const { error } = await supabase.from('collab_requests').insert({
    requester_id: requesterId,
    target_user_id: targetUserId,
  });

  if (error) throw new Error(errMsg(error));
}

export async function acceptCollabRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_collab_request', {
    p_request_id: requestId,
  });
  if (error) throw new Error(errMsg(error));
}

export async function declineCollabRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('collab_requests')
    .update({ status: 'declined' })
    .eq('id', requestId);
  if (error) throw new Error(errMsg(error));
}

export async function cancelCollabRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('collab_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId);
  if (error) throw new Error(errMsg(error));
}

export async function disconnectCollab(otherUserId: string): Promise<void> {
  const { error } = await supabase.rpc('disconnect_collab', {
    p_other_user_id: otherUserId,
  });
  if (error) throw new Error(errMsg(error));
}
