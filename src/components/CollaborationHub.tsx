/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AccessibleTree,
  CollabRequest,
  FamilyMember,
  FamilyDirectoryEntry,
  MemberLink,
  ProposedSuggestion,
  VirtualMember,
} from '../types';
import { TreeCanvas } from './TreeCanvas';
import { TreeLayout } from '../lib/lineageDb';
import { sourceBadgeForMember } from '../lib/treeMerge';
import { downloadFamilyJson } from '../lib/shareBranch';
import { isImportedTreeId, parseFamilyJsonExport } from '../lib/importFamilyJson';
import {
  Users,
  Check,
  X,
  Eye,
  FileCheck,
  Link2,
  Loader2,
  AlertTriangle,
  GitBranch,
  UserPlus,
  Database,
} from 'lucide-react';

export interface CollaborationHubProps {
  ownTreeId: string;
  ownUserId: string;
  ownMembers: FamilyMember[];
  anchorMemberId: string | null;
  heritageMode: boolean;
  accessibleTrees: AccessibleTree[];
  familyDirectory: FamilyDirectoryEntry[];
  incomingCollabRequests: CollabRequest[];
  memberLinks: MemberLink[];
  suggestions: ProposedSuggestion[];
  mergedMembers: FamilyMember[];
  virtualMembers: VirtualMember[];
  virtualById: Map<string, VirtualMember>;
  conflicts: { virtualId: string; field: string; values: { treeName: string; value: string }[] }[];
  linkCandidates: {
    treeAId: string;
    memberAId: string;
    treeBId: string;
    memberBId: string;
    score: number;
    label: string;
  }[];
  loading: boolean;
  error: string | null;
  schemaMissing: boolean;
  hubFocusId: string | null;
  onFocusChange: (id: string) => void;
  onAskToCollab: (targetUserId: string) => Promise<void>;
  onAcceptCollab: (requestId: string) => Promise<void>;
  onDeclineCollab: (requestId: string) => Promise<void>;
  onCancelCollab: (requestId: string) => Promise<void>;
  onDisconnect: (otherUserId: string) => Promise<void>;
  onLinkMembers: (
    treeAId: string,
    memberAId: string,
    treeBId: string,
    memberBId: string
  ) => Promise<void>;
  onAcceptLink: (linkId: string) => Promise<void>;
  onRejectLink: (linkId: string) => Promise<void>;
  onApproveSuggestion: (suggestion: ProposedSuggestion) => Promise<void>;
  onRejectSuggestion: (suggestionId: string) => Promise<void>;
  onRefresh: () => void;
  onSubmitSuggestion: (
    treeId: string,
    authorName: string,
    data: Omit<ProposedSuggestion, 'id' | 'status' | 'author' | 'timestamp' | 'treeId'>
  ) => Promise<void>;
  onImportJson?: (members: FamilyMember[], label?: string) => void;
  onRemoveImportedTree?: (treeId: string) => void;
  userDisplayName?: string;
}

function SuggestionDiff({
  sug,
  members,
}: {
  sug: ProposedSuggestion;
  members: FamilyMember[];
}) {
  const original = sug.memberId ? members.find((m) => m.id === sug.memberId) : null;
  const suggested = sug.suggestedData.member;

  if (sug.type === 'add_member' && suggested) {
    return (
      <div className="text-xs space-y-1">
        <p>
          <strong>New:</strong> {suggested.firstName} {suggested.lastName}
        </p>
        {suggested.birthDate && <p>Born: {suggested.birthDate}</p>}
        {suggested.biography && <p className="italic text-[#7A7570]">"{suggested.biography}"</p>}
      </div>
    );
  }

  if (sug.type === 'edit_member' && original && suggested) {
    const fields = ['firstName', 'lastName', 'biography', 'occupation', 'birthPlace'] as const;
    const changes = fields.filter((f) => suggested[f] && suggested[f] !== original[f]);
    return (
      <div className="text-xs space-y-2">
        <p className="font-bold">
          {original.firstName} {original.lastName}
        </p>
        {changes.map((f) => (
          <div key={f} className="grid grid-cols-2 gap-2 border border-[#E5E1DA] rounded p-2">
            <span className="text-[#A8A29E] line-through">{String(original[f] || '—')}</span>
            <span className="text-green-800 font-medium">{String(suggested[f])}</span>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-xs text-[#7A7570] italic">{sug.description}</p>;
}

export const CollaborationHub: React.FC<CollaborationHubProps> = ({
  ownTreeId,
  ownUserId,
  ownMembers,
  anchorMemberId,
  heritageMode,
  accessibleTrees,
  familyDirectory,
  incomingCollabRequests,
  memberLinks,
  suggestions,
  mergedMembers,
  virtualMembers,
  virtualById,
  conflicts,
  linkCandidates,
  loading,
  error,
  schemaMissing,
  hubFocusId,
  onFocusChange,
  onAskToCollab,
  onAcceptCollab,
  onDeclineCollab,
  onCancelCollab,
  onDisconnect,
  onLinkMembers,
  onAcceptLink,
  onRejectLink,
  onApproveSuggestion,
  onRejectSuggestion,
  onRefresh,
  onSubmitSuggestion,
  onImportJson,
  onRemoveImportedTree,
  userDisplayName = 'Contributor',
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProposedSuggestion | null>(null);
  const [linkTreeA, setLinkTreeA] = useState(ownTreeId);
  const [linkMemberA, setLinkMemberA] = useState('');
  const [linkTreeB, setLinkTreeB] = useState('');
  const [linkMemberB, setLinkMemberB] = useState('');
  const [hubLayout, setHubLayout] = useState<TreeLayout>('mergedRoots');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [suggestBio, setSuggestBio] = useState('');
  const [suggestTargetKey, setSuggestTargetKey] = useState('');
  const [showJsonFallback, setShowJsonFallback] = useState(false);

  const sourceBadges = useMemo(() => {
    const map: Record<string, string> = {};
    for (const vm of virtualMembers) {
      map[vm.virtualId] = sourceBadgeForMember(vm);
    }
    return map;
  }, [virtualMembers]);

  const sharedTrees = accessibleTrees.filter((t) => !t.isOwnTree && !isImportedTreeId(t.treeId));
  const importedJsonTrees = accessibleTrees.filter((t) => isImportedTreeId(t.treeId));
  const pendingLinks = memberLinks.filter((l) => l.status === 'pending');
  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');
  const focusId = hubFocusId || mergedMembers[0]?.id || '';
  const connectedCount = familyDirectory.filter((d) => d.connectionStatus === 'connected').length;

  const membersForSuggestionLookup = useMemo(() => {
    const all: FamilyMember[] = [];
    for (const t of accessibleTrees) all.push(...t.members);
    return all;
  }, [accessibleTrees]);

  const contributorTargets = useMemo(() => {
    const targets: { treeId: string; treeName: string; memberId: string; member: FamilyMember }[] =
      [];
    for (const t of accessibleTrees) {
      if (t.isOwnTree || t.role !== 'contributor') continue;
      for (const m of t.members) {
        targets.push({
          treeId: t.treeId,
          treeName: t.ownerName,
          memberId: m.id,
          member: m,
        });
      }
    }
    return targets;
  }, [accessibleTrees]);

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTreeA || !linkMemberA || !linkTreeB || !linkMemberB) return;
    await runAction('link', () => onLinkMembers(linkTreeA, linkMemberA, linkTreeB, linkMemberB));
    setLinkMemberA('');
    setLinkMemberB('');
  };

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const [tid, mid] = suggestTargetKey.split(':');
    if (!tid || !mid || !suggestBio.trim()) return;
    const target = contributorTargets.find((t) => t.treeId === tid && t.memberId === mid);
    if (!target) return;
    await runAction('suggest', () =>
      onSubmitSuggestion(tid, userDisplayName, {
        type: 'edit_member',
        memberId: mid,
        description: `Suggested biography update for ${target.member.firstName} ${target.member.lastName}`,
        suggestedData: {
          member: { ...target.member, biography: suggestBio.trim() },
        },
      })
    );
    setSuggestBio('');
    setSuggestTargetKey('');
  };

  const selectedVirtual = focusId ? virtualById.get(focusId) : null;

  const isOwnerOfSuggestion = (sug: ProposedSuggestion) => sug.treeId === ownTreeId;

  if (schemaMissing) {
    return (
      <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-xl mx-auto space-y-4 text-center">
        <Database className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-xl font-serif font-bold text-[#2D2926]">Collaboration setup needed</h2>
        <p className="text-sm text-[#5C5652] leading-relaxed">
          Run the collaboration migration in your Supabase SQL editor:
        </p>
        <code className="block text-xs bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg p-3 text-left">
          supabase/migrations/20260531160000_fix_collaboration.sql
        </code>
        <button
          type="button"
          onClick={onRefresh}
          className="px-4 py-2 bg-[#2D2926] text-white rounded-lg text-sm font-semibold"
        >
          I ran it — refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-[#2D2926] flex items-center gap-2">
          <GitBranch className="w-6 h-6" />
          Collaboration Hub
        </h2>
        <p className="text-sm text-[#7A7570] mt-1 max-w-2xl">
          Connect with family on Kith & Kin, then link the same person across trees to see one
          expanded family view here.
        </p>
      </div>

      {(error || actionError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {actionError || error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <aside className="xl:col-span-3 space-y-4">
          {incomingCollabRequests.length > 0 && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <h3 className="font-serif font-bold text-amber-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Requests for you
              </h3>
              {incomingCollabRequests.map((req) => (
                <div
                  key={req.id}
                  className="text-sm space-y-2 p-3 bg-white rounded-lg border border-amber-100"
                >
                  <p>
                    <strong>
                      {req.requesterFirstName} {req.requesterLastName}
                    </strong>{' '}
                    wants to connect trees with you.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => runAction(req.id, () => onAcceptCollab(req.id))}
                      className="flex-1 py-2 bg-green-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => runAction(req.id, () => onDeclineCollab(req.id))}
                      className="flex-1 py-2 border border-[#E5E1DA] rounded-lg font-bold text-xs disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="bg-white border border-[#E5E1DA] rounded-xl p-4 space-y-3">
            <h3 className="font-serif font-bold text-[#2D2926] flex items-center gap-2">
              <Users className="w-4 h-4" /> Family on Kith & Kin
            </h3>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#A8A29E]" />
            ) : familyDirectory.length === 0 ? (
              <p className="text-sm text-[#7A7570] italic">
                No other family accounts yet. When relatives sign up, they will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {familyDirectory.map((person) => (
                  <li
                    key={person.userId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E1DA] text-sm"
                  >
                    <span className="font-medium text-[#2D2926] truncate">
                      {person.firstName} {person.lastName}
                    </span>
                    {person.connectionStatus === 'connected' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] uppercase font-bold text-green-700">Connected</span>
                        <button
                          type="button"
                          onClick={() => runAction(person.userId, () => onDisconnect(person.userId))}
                          className="text-[10px] text-[#7A7570] hover:text-red-600 underline"
                        >
                          Disconnect
                        </button>
                      </div>
                    )}
                    {person.connectionStatus === 'none' && (
                      <button
                        type="button"
                        disabled={busyId === person.userId}
                        onClick={() => runAction(person.userId, () => onAskToCollab(person.userId))}
                        className="shrink-0 px-2 py-1 bg-[#2D2926] text-white rounded text-xs font-semibold disabled:opacity-50"
                      >
                        Ask to collab
                      </button>
                    )}
                    {person.connectionStatus === 'pending_out' && person.requestId && (
                      <button
                        type="button"
                        disabled={busyId === person.requestId}
                        onClick={() =>
                          runAction(person.requestId!, () => onCancelCollab(person.requestId!))
                        }
                        className="shrink-0 text-xs text-[#7A7570] hover:text-red-600 disabled:opacity-50"
                      >
                        Waiting… Cancel
                      </button>
                    )}
                    {person.connectionStatus === 'pending_in' && (
                      <span className="text-[10px] text-amber-700 font-bold shrink-0">See above</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {connectedCount > 0 && (
            <section className="bg-white border border-[#E5E1DA] rounded-xl p-4 space-y-2">
              <h3 className="font-serif font-bold text-[#2D2926] text-sm">Trees in this view</h3>
              <ul className="space-y-1 text-sm">
                {accessibleTrees.map((t) => (
                  <li key={t.treeId} className="text-[#5C5652]">
                    {t.isOwnTree ? 'My tree' : `${t.ownerName}'s tree`}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {importedJsonTrees.length > 0 && (
            <section className="bg-white border border-[#E5E1DA] rounded-xl p-4 space-y-2">
              <h3 className="font-serif font-bold text-[#2D2926] text-sm">Imported JSON trees</h3>
              <ul className="space-y-2 text-sm">
                {importedJsonTrees.map((t) => (
                  <li
                    key={t.treeId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E1DA]"
                  >
                    <span className="truncate">
                      {t.name} ({t.members.length} people)
                    </span>
                    {onRemoveImportedTree && (
                      <button
                        type="button"
                        onClick={() => onRemoveImportedTree(t.treeId)}
                        className="text-xs text-red-600 hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(sharedTrees.length > 0 || importedJsonTrees.length > 0) && (
            <section className="bg-white border border-[#E5E1DA] rounded-xl p-4 space-y-3">
              <h3 className="font-serif font-bold text-[#2D2926] flex items-center gap-2 text-sm">
                <Link2 className="w-4 h-4" /> Link same person
              </h3>
              <p className="text-xs text-[#7A7570]">
                Connect matching people so branches fold together in the merged tree.
              </p>
              <form onSubmit={handleLinkSubmit} className="space-y-2 text-sm">
                <select
                  value={linkTreeA}
                  onChange={(e) => {
                    setLinkTreeA(e.target.value);
                    setLinkMemberA('');
                  }}
                  className="w-full border border-[#E5E1DA] rounded-lg px-2 py-1.5"
                >
                  {accessibleTrees.map((t) => (
                    <option key={t.treeId} value={t.treeId}>
                      {t.isOwnTree ? 'My tree' : isImportedTreeId(t.treeId) ? t.name : t.ownerName}
                    </option>
                  ))}
                </select>
                <select
                  value={linkMemberA}
                  onChange={(e) => setLinkMemberA(e.target.value)}
                  className="w-full border border-[#E5E1DA] rounded-lg px-2 py-1.5"
                  required
                >
                  <option value="">Person in first tree…</option>
                  {accessibleTrees
                    .find((t) => t.treeId === linkTreeA)
                    ?.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                </select>
                <select
                  value={linkTreeB}
                  onChange={(e) => {
                    setLinkTreeB(e.target.value);
                    setLinkMemberB('');
                  }}
                  className="w-full border border-[#E5E1DA] rounded-lg px-2 py-1.5"
                  required
                >
                  <option value="">Second tree…</option>
                  {accessibleTrees
                    .filter((t) => t.treeId !== linkTreeA)
                    .map((t) => (
                      <option key={t.treeId} value={t.treeId}>
                        {t.isOwnTree ? 'My tree' : isImportedTreeId(t.treeId) ? t.name : t.ownerName}
                      </option>
                    ))}
                </select>
                <select
                  value={linkMemberB}
                  onChange={(e) => setLinkMemberB(e.target.value)}
                  className="w-full border border-[#E5E1DA] rounded-lg px-2 py-1.5"
                  required
                >
                  <option value="">Person in second tree…</option>
                  {accessibleTrees
                    .find((t) => t.treeId === linkTreeB)
                    ?.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                </select>
                <button
                  type="submit"
                  disabled={busyId === 'link'}
                  className="w-full py-2 bg-[#2D2926] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  Request link
                </button>
              </form>

              {linkCandidates.length > 0 && (
                <div className="pt-2 border-t border-[#E5E1DA] space-y-2">
                  <p className="text-[10px] font-bold uppercase text-[#7A7570]">Suggested matches</p>
                  {linkCandidates.slice(0, 5).map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        runAction(`cand-${i}`, () =>
                          onLinkMembers(c.treeAId, c.memberAId, c.treeBId, c.memberBId)
                        )
                      }
                      className="w-full text-left text-xs p-2 rounded border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50"
                    >
                      Is <strong>{c.label}</strong> the same person?
                    </button>
                  ))}
                </div>
              )}

              {pendingLinks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-bold uppercase text-[#7A7570]">Pending links</p>
                  {pendingLinks.map((link) => (
                    <div key={link.id} className="flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => runAction(link.id, () => onAcceptLink(link.id))}
                        className="flex-1 py-1 bg-green-700 text-white rounded disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction(link.id, () => onRejectLink(link.id))}
                        className="flex-1 py-1 border rounded disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {onImportJson && (
            <section className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 space-y-2">
              <button
                type="button"
                onClick={() => setShowJsonFallback((v) => !v)}
                className="text-sm font-bold text-[#7A7570] hover:text-[#2D2926]"
              >
                {showJsonFallback ? 'Hide' : 'Show'} JSON import fallback
              </button>
              {showJsonFallback && (
                <>
                  <p className="text-xs text-[#7A7570]">
                    For relatives not on the app — import their export, then link the shared person.
                  </p>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !onImportJson) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const parsed = parseFamilyJsonExport(String(reader.result));
                          onImportJson(parsed, file.name.replace(/\.json$/i, '') || 'Imported tree');
                          setActionError(null);
                        } catch (err) {
                          setActionError(
                            err instanceof Error ? err.message : 'Could not import JSON file.'
                          );
                        }
                      };
                      reader.onerror = () => setActionError('Could not read file.');
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                    className="text-xs w-full"
                  />
                  <button
                    type="button"
                    onClick={() => downloadFamilyJson(ownMembers, 'my_tree_export.json')}
                    className="text-xs text-[#2D2926] underline"
                  >
                    Download my tree JSON
                  </button>
                </>
              )}
            </section>
          )}
        </aside>

        <div className="xl:col-span-9 space-y-4">
          {connectedCount === 0 && importedJsonTrees.length === 0 && !loading && (
            <div className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 text-sm text-[#5C5652] space-y-2">
              <p className="font-semibold text-[#2D2926]">How to expand your family tree here</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Find a relative in the list and tap <strong>Ask to collab</strong></li>
                <li>They accept your request (or accept theirs)</li>
                <li>Link the same person across both trees</li>
                <li>See the merged family tree below</li>
              </ol>
            </div>
          )}

          {selectedVirtual && (
            <div className="bg-white border border-[#E5E1DA] rounded-xl p-4 text-sm">
              <p className="text-[10px] font-bold uppercase text-[#7A7570] mb-2">Combined details</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedVirtual.sources.map((s) => (
                  <span
                    key={`${s.treeId}-${s.memberId}`}
                    className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800"
                  >
                    From {s.treeName}
                  </span>
                ))}
              </div>
              {selectedVirtual.biography && (
                <p className="text-[#7A7570] italic">{selectedVirtual.biography}</p>
              )}
            </div>
          )}

          {conflicts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Conflicting details
              </h3>
              {conflicts.slice(0, 3).map((c, i) => (
                <div key={i} className="text-xs">
                  <strong>{c.field}</strong>:{' '}
                  {c.values.map((v) => `${v.treeName}: "${v.value}"`).join(' · ')}
                </div>
              ))}
            </div>
          )}

          {mergedMembers.length > 0 && focusId ? (
            <TreeCanvas
              members={mergedMembers}
              focusId={focusId}
              anchorMemberId={anchorMemberId}
              heritageMode={heritageMode}
              layout={hubLayout}
              onLayoutChange={setHubLayout}
              onSelectFocus={onFocusChange}
              onAddRelativeRequest={() => {}}
              sourceBadges={sourceBadges}
              readOnly
            />
          ) : (
            <div className="border-2 border-dashed border-[#E5E1DA] rounded-2xl p-12 text-center text-[#7A7570]">
              <Users className="w-10 h-10 mx-auto mb-3 text-[#A8A29E]" />
              <p>Connect with a relative to see your expanded family tree here.</p>
            </div>
          )}
        </div>
      </div>

      {contributorTargets.length > 0 && (
        <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
          <h3 className="font-serif font-bold text-indigo-900">Propose a change</h3>
          <form onSubmit={handleSubmitSuggestion} className="grid sm:grid-cols-2 gap-3 text-sm">
            <select
              value={suggestTargetKey}
              onChange={(e) => setSuggestTargetKey(e.target.value)}
              className="border border-indigo-200 rounded-lg px-3 py-2 bg-white"
              required
            >
              <option value="">Choose a person…</option>
              {contributorTargets.map((t) => (
                <option key={`${t.treeId}-${t.memberId}`} value={`${t.treeId}:${t.memberId}`}>
                  {t.member.firstName} {t.member.lastName} ({t.treeName})
                </option>
              ))}
            </select>
            <textarea
              value={suggestBio}
              onChange={(e) => setSuggestBio(e.target.value)}
              placeholder="Suggested biography or note…"
              className="border border-indigo-200 rounded-lg px-3 py-2 bg-white min-h-[80px] sm:col-span-2"
              required
            />
            <button
              type="submit"
              disabled={busyId === 'suggest'}
              className="sm:col-span-2 py-2.5 bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              Submit suggestion
            </button>
          </form>
        </section>
      )}

      <section className="bg-white border border-[#E5E1DA] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-lg text-[#2D2926] flex items-center gap-2">
            <FileCheck className="w-5 h-5" /> Suggestions
            {pendingSuggestions.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {pendingSuggestions.length} pending
              </span>
            )}
          </h3>
          <button type="button" onClick={onRefresh} className="text-xs text-[#7A7570] hover:text-[#2D2926]">
            Refresh
          </button>
        </div>

        {suggestions.length === 0 ? (
          <p className="text-sm text-[#7A7570] italic text-center py-4">
            Contributors can propose changes to trees they access. You approve them here.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                className={`border rounded-xl p-4 text-sm ${
                  sug.status === 'pending' ? 'border-amber-200 bg-amber-50/20' : 'border-[#E5E1DA]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-bold">{sug.description}</span>
                  <span className="text-[10px] uppercase font-bold text-[#7A7570]">{sug.status}</span>
                </div>
                <p className="text-xs text-[#7A7570]">By {sug.author}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSuggestion(sug)}
                    className="px-3 py-1.5 border rounded text-xs font-bold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Review
                  </button>
                  {sug.status === 'pending' && isOwnerOfSuggestion(sug) && (
                    <>
                      <button
                        type="button"
                        onClick={() => runAction(sug.id, () => onApproveSuggestion(sug))}
                        className="px-3 py-1.5 bg-green-700 text-white rounded text-xs font-bold disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction(sug.id, () => onRejectSuggestion(sug.id))}
                        className="px-3 py-1.5 border border-red-200 text-red-700 rounded text-xs font-bold disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-lg">
            <div className="flex justify-between items-start">
              <h3 className="font-serif font-bold">Suggestion review</h3>
              <button type="button" onClick={() => setSelectedSuggestion(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <SuggestionDiff sug={selectedSuggestion} members={membersForSuggestionLookup} />
            {selectedSuggestion.status === 'pending' && isOwnerOfSuggestion(selectedSuggestion) && (
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    runAction(selectedSuggestion.id, () => onRejectSuggestion(selectedSuggestion.id));
                    setSelectedSuggestion(null);
                  }}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => {
                    runAction(selectedSuggestion.id, async () => {
                      await onApproveSuggestion(selectedSuggestion);
                      setSelectedSuggestion(null);
                    });
                  }}
                  className="px-4 py-2 bg-green-700 text-white rounded text-sm font-bold"
                >
                  Approve & apply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
