/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibleTree,
  CollabRequest,
  FamilyMember,
  FamilyDirectoryEntry,
  MemberLink,
  ProposedSuggestion,
  VirtualMember,
} from '../types';
import {
  acceptCollabRequest,
  approveSuggestionById,
  cancelCollabRequest,
  createMemberLink,
  createSuggestion,
  declineCollabRequest,
  disconnectCollab,
  isCollaborationSchemaError,
  loadAccessibleTrees,
  loadFamilyDirectory,
  loadIncomingCollabRequests,
  loadMemberLinks,
  loadSuggestionsForTrees,
  sendCollabRequest,
  suggestLinkCandidates,
  updateMemberLinkStatus,
  updateSuggestionStatus,
} from '../lib/collaborationDb';
import { isImportedTreeId, newImportedTreeId, normalizeFamilyMembers } from '../lib/importFamilyJson';
import { mergeTrees, virtualMembersForCanvas } from '../lib/treeMerge';

export function useCollaborationStore(
  userId: string | undefined,
  ownTreeId: string | undefined,
  ownMembers: FamilyMember[],
  anchorMemberId: string | null
) {
  const [accessibleTrees, setAccessibleTrees] = useState<AccessibleTree[]>([]);
  const [importedTrees, setImportedTrees] = useState<AccessibleTree[]>([]);
  const [localMemberLinks, setLocalMemberLinks] = useState<MemberLink[]>([]);
  const [familyDirectory, setFamilyDirectory] = useState<FamilyDirectoryEntry[]>([]);
  const [incomingCollabRequests, setIncomingCollabRequests] = useState<CollabRequest[]>([]);
  const [memberLinks, setMemberLinks] = useState<MemberLink[]>([]);
  const [suggestions, setSuggestions] = useState<ProposedSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [hubFocusId, setHubFocusId] = useState<string | null>(null);

  const treesForMerge = useMemo(
    () => [...accessibleTrees, ...importedTrees],
    [accessibleTrees, importedTrees]
  );

  const allMemberLinks = useMemo(
    () => [...memberLinks, ...localMemberLinks],
    [memberLinks, localMemberLinks]
  );

  const refresh = useCallback(async () => {
    if (!userId || !ownTreeId) return;
    setLoading(true);
    setError(null);
    setSchemaMissing(false);
    try {
      const [trees, directory, incoming, links] = await Promise.all([
        loadAccessibleTrees(userId, ownTreeId, ownMembers),
        loadFamilyDirectory(userId),
        loadIncomingCollabRequests(userId),
        loadMemberLinks(userId),
      ]);
      setAccessibleTrees(trees);
      setFamilyDirectory(directory);
      setIncomingCollabRequests(incoming);
      setMemberLinks(links);

      const treeIds = trees.map((t) => t.treeId);
      const sug = await loadSuggestionsForTrees(treeIds);
      setSuggestions(sug);
    } catch (e) {
      if (isCollaborationSchemaError(e)) {
        setSchemaMissing(true);
      }
      setError(e instanceof Error ? e.message : 'Failed to load collaboration data');
    } finally {
      setLoading(false);
    }
  }, [userId, ownTreeId, ownMembers]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mergeResult = useMemo(() => {
    if (!userId || !ownTreeId || treesForMerge.length === 0) {
      return { virtualMembers: [] as VirtualMember[], conflicts: [], sourceToVirtual: new Map() };
    }
    try {
      return mergeTrees({
        trees: treesForMerge,
        links: allMemberLinks,
        anchorTreeId: ownTreeId,
        anchorMemberId,
        userId,
      });
    } catch (e) {
      console.error('Failed to merge collaboration trees:', e);
      return { virtualMembers: [] as VirtualMember[], conflicts: [], sourceToVirtual: new Map() };
    }
  }, [treesForMerge, allMemberLinks, ownTreeId, anchorMemberId, userId]);

  const mergedMembers = useMemo(
    () => virtualMembersForCanvas(mergeResult.virtualMembers),
    [mergeResult.virtualMembers]
  );

  const linkCandidates = useMemo(() => {
    try {
      return suggestLinkCandidates(treesForMerge);
    } catch (e) {
      console.error('Failed to suggest link candidates:', e);
      return [];
    }
  }, [treesForMerge]);

  const importJsonTree = useCallback(
    (members: FamilyMember[], label = 'Imported tree') => {
      const normalized = normalizeFamilyMembers(members);
      const tree: AccessibleTree = {
        treeId: newImportedTreeId(),
        name: label,
        ownerId: 'imported',
        ownerName: label,
        role: 'viewer',
        members: normalized,
        isOwnTree: false,
      };
      setImportedTrees((prev) => [...prev, tree]);
      return tree;
    },
    []
  );

  const removeImportedTree = useCallback((treeId: string) => {
    setImportedTrees((prev) => prev.filter((t) => t.treeId !== treeId));
    setLocalMemberLinks((prev) =>
      prev.filter((l) => l.treeAId !== treeId && l.treeBId !== treeId)
    );
  }, []);

  useEffect(() => {
    if (mergedMembers.length === 0) return;
    const anchor = mergeResult.virtualMembers.find((v) => v.isAnchor);
    const defaultFocus = anchor?.virtualId ?? mergedMembers[0]?.id ?? null;
    setHubFocusId((current) => {
      if (current && mergedMembers.some((m) => m.id === current)) return current;
      return defaultFocus;
    });
  }, [mergedMembers, mergeResult.virtualMembers]);

  const askToCollab = async (targetUserId: string) => {
    await sendCollabRequest(targetUserId);
    await refresh();
  };

  const acceptCollab = async (requestId: string) => {
    await acceptCollabRequest(requestId);
    await refresh();
  };

  const declineCollab = async (requestId: string) => {
    await declineCollabRequest(requestId);
    await refresh();
  };

  const cancelCollab = async (requestId: string) => {
    await cancelCollabRequest(requestId);
    await refresh();
  };

  const disconnectFromUser = async (otherUserId: string) => {
    await disconnectCollab(otherUserId);
    await refresh();
  };

  const linkMembers = async (
    treeAId: string,
    memberAId: string,
    treeBId: string,
    memberBId: string
  ) => {
    if (isImportedTreeId(treeAId) || isImportedTreeId(treeBId)) {
      if (!userId) throw new Error('Not signed in');
      const link: MemberLink = {
        id: `local-${crypto.randomUUID()}`,
        treeAId,
        memberAId,
        treeBId,
        memberBId,
        status: 'accepted',
        createdBy: userId,
      };
      setLocalMemberLinks((prev) => {
        const exists = prev.some(
          (l) =>
            l.treeAId === treeAId &&
            l.memberAId === memberAId &&
            l.treeBId === treeBId &&
            l.memberBId === memberBId
        );
        return exists ? prev : [...prev, link];
      });
      return;
    }
    await createMemberLink(treeAId, memberAId, treeBId, memberBId);
    await refresh();
  };

  const acceptLink = async (linkId: string) => {
    if (linkId.startsWith('local-')) {
      setLocalMemberLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, status: 'accepted' as const } : l))
      );
      return;
    }
    await updateMemberLinkStatus(linkId, 'accepted');
    await refresh();
  };

  const rejectLink = async (linkId: string) => {
    if (linkId.startsWith('local-')) {
      setLocalMemberLinks((prev) => prev.filter((l) => l.id !== linkId));
      return;
    }
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

  const virtualById = useMemo(
    () => new Map(mergeResult.virtualMembers.map((v) => [v.virtualId, v])),
    [mergeResult.virtualMembers]
  );

  return {
    accessibleTrees: treesForMerge,
    importedTrees,
    familyDirectory,
    incomingCollabRequests,
    memberLinks: allMemberLinks,
    suggestions,
    loading,
    error,
    schemaMissing,
    refresh,
    mergedMembers,
    virtualMembers: mergeResult.virtualMembers,
    virtualById,
    conflicts: mergeResult.conflicts,
    linkCandidates,
    hubFocusId,
    setHubFocusId,
    askToCollab,
    acceptCollab,
    declineCollab,
    cancelCollab,
    disconnectFromUser,
    importJsonTree,
    removeImportedTree,
    linkMembers,
    acceptLink,
    rejectLink,
    submitSuggestion,
    approveSuggestion,
    rejectSuggestion,
  };
}
