/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibleTree,
  FamilyMember,
  MemberLink,
  ProposedSuggestion,
  TreeInvite,
  VirtualMember,
} from '../types';
import {
  acceptInviteByToken,
  acceptTreeInvite,
  approveSuggestionById,
  createMemberLink,
  createSuggestion,
  createTreeInvite,
  declineTreeInvite,
  loadAccessibleTrees,
  loadIncomingInvites,
  loadMemberLinks,
  loadOutgoingInvites,
  loadSuggestionsForTrees,
  revokeMembership,
  revokeTreeInvite,
  suggestLinkCandidates,
  updateMemberLinkStatus,
  updateSuggestionStatus,
} from '../lib/collaborationDb';
import { mergeTrees, virtualMembersForCanvas } from '../lib/treeMerge';

export function useCollaborationStore(
  userId: string | undefined,
  ownTreeId: string | undefined,
  ownMembers: FamilyMember[],
  anchorMemberId: string | null,
  userEmail: string | undefined
) {
  const [accessibleTrees, setAccessibleTrees] = useState<AccessibleTree[]>([]);
  const [outgoingInvites, setOutgoingInvites] = useState<TreeInvite[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<TreeInvite[]>([]);
  const [memberLinks, setMemberLinks] = useState<MemberLink[]>([]);
  const [suggestions, setSuggestions] = useState<ProposedSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hubFocusId, setHubFocusId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId || !ownTreeId) return;
    setLoading(true);
    setError(null);
    try {
      const [trees, outInv, inInv, links] = await Promise.all([
        loadAccessibleTrees(userId, ownTreeId, ownMembers),
        loadOutgoingInvites(ownTreeId),
        userEmail ? loadIncomingInvites(userEmail) : Promise.resolve([]),
        loadMemberLinks(userId),
      ]);
      setAccessibleTrees(trees);
      setOutgoingInvites(outInv);
      setIncomingInvites(inInv);
      setMemberLinks(links);

      const treeIds = trees.map((t) => t.treeId);
      const sug = await loadSuggestionsForTrees(treeIds);
      setSuggestions(sug);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collaboration data');
    } finally {
      setLoading(false);
    }
  }, [userId, ownTreeId, ownMembers, userEmail]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (!token || !userId) return;

    acceptInviteByToken(token, userId)
      .then(() => {
        params.delete('invite');
        const qs = params.toString();
        window.history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
        refresh();
      })
      .catch(() => {});
  }, [userId, refresh]);

  const mergeResult = useMemo(() => {
    if (!userId || !ownTreeId || accessibleTrees.length === 0) {
      return { virtualMembers: [] as VirtualMember[], conflicts: [], sourceToVirtual: new Map() };
    }
    return mergeTrees({
      trees: accessibleTrees,
      links: memberLinks,
      anchorTreeId: ownTreeId,
      anchorMemberId,
      userId,
    });
  }, [accessibleTrees, memberLinks, ownTreeId, anchorMemberId, userId]);

  const mergedMembers = useMemo(
    () => virtualMembersForCanvas(mergeResult.virtualMembers),
    [mergeResult.virtualMembers]
  );

  const linkCandidates = useMemo(
    () => suggestLinkCandidates(accessibleTrees),
    [accessibleTrees]
  );

  useEffect(() => {
    if (mergedMembers.length === 0) return;
    const anchor = mergeResult.virtualMembers.find((v) => v.isAnchor);
    const defaultFocus = anchor?.virtualId ?? mergedMembers[0]?.id ?? null;
    if (!hubFocusId || !mergedMembers.find((m) => m.id === hubFocusId)) {
      setHubFocusId(defaultFocus);
    }
  }, [mergedMembers, mergeResult.virtualMembers, hubFocusId]);

  const sendInvite = async (
    email: string,
    role: 'viewer' | 'contributor' | 'editor',
    branchRootMemberId?: string
  ) => {
    if (!ownTreeId) throw new Error('No tree');
    const result = await createTreeInvite(ownTreeId, email, role, branchRootMemberId);
    await refresh();
    return result;
  };

  const acceptInvite = async (inviteId: string) => {
    if (!userId) return;
    await acceptTreeInvite(inviteId, userId);
    await refresh();
  };

  const declineInvite = async (inviteId: string) => {
    await declineTreeInvite(inviteId);
    await refresh();
  };

  const cancelInvite = async (inviteId: string) => {
    await revokeTreeInvite(inviteId);
    await refresh();
  };

  const linkMembers = async (
    treeAId: string,
    memberAId: string,
    treeBId: string,
    memberBId: string
  ) => {
    await createMemberLink(treeAId, memberAId, treeBId, memberBId);
    await refresh();
  };

  const acceptLink = async (linkId: string) => {
    await updateMemberLinkStatus(linkId, 'accepted');
    await refresh();
  };

  const rejectLink = async (linkId: string) => {
    await updateMemberLinkStatus(linkId, 'rejected');
    await refresh();
  };

  const submitSuggestion = async (
    treeId: string,
    authorName: string,
    data: Omit<ProposedSuggestion, 'id' | 'status' | 'author' | 'timestamp' | 'treeId'>
  ) => {
    await createSuggestion(treeId, authorName, data);
    await refresh();
  };

  const approveSuggestion = async (suggestion: ProposedSuggestion) => {
    await approveSuggestionById(suggestion);
    await refresh();
  };

  const rejectSuggestion = async (suggestionId: string) => {
    await updateSuggestionStatus(suggestionId, 'rejected');
    await refresh();
  };

  const removeMemberAccess = async (treeId: string, memberUserId: string) => {
    await revokeMembership(treeId, memberUserId);
    await refresh();
  };

  const virtualById = useMemo(
    () => new Map(mergeResult.virtualMembers.map((v) => [v.virtualId, v])),
    [mergeResult.virtualMembers]
  );

  return {
    accessibleTrees,
    outgoingInvites,
    incomingInvites,
    memberLinks,
    suggestions,
    loading,
    error,
    refresh,
    mergedMembers,
    virtualMembers: mergeResult.virtualMembers,
    virtualById,
    conflicts: mergeResult.conflicts,
    linkCandidates,
    hubFocusId,
    setHubFocusId,
    sendInvite,
    acceptInvite,
    declineInvite,
    cancelInvite,
    linkMembers,
    acceptLink,
    rejectLink,
    submitSuggestion,
    approveSuggestion,
    rejectSuggestion,
    removeMemberAccess,
  };
}
