/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  AccessibleTree,
  CollaborationRole,
  FamilyMember,
  MemberLink,
  ProposedSuggestion,
  VirtualMember,
} from '../types';
import { TreeCanvas } from './TreeCanvas';
import { TreeLayout } from '../lib/lineageDb';
import { sourceBadgeForMember } from '../lib/treeMerge';
import { downloadFamilyJson } from '../lib/shareBranch';
import {
  Users,
  Share2,
  Check,
  X,
  Eye,
  UserPlus,
  FileCheck,
  Link2,
  Loader2,
  Bell,
  FileUp,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';

export interface CollaborationHubProps {
  ownTreeId: string;
  ownMembers: FamilyMember[];
  anchorMemberId: string | null;
  heritageMode: boolean;
  accessibleTrees: AccessibleTree[];
  outgoingInvites: import('../types').TreeInvite[];
  incomingInvites: import('../types').TreeInvite[];
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
  hubFocusId: string | null;
  onFocusChange: (id: string) => void;
  onSendInvite: (
    email: string,
    role: CollaborationRole,
    branchRootMemberId?: string
  ) => Promise<{ inviteUrl: string }>;
  onAcceptInvite: (inviteId: string) => Promise<void>;
  onDeclineInvite: (inviteId: string) => Promise<void>;
  onCancelInvite: (inviteId: string) => Promise<void>;
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
  onImportJson?: (members: FamilyMember[]) => void;
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
  ownMembers,
  anchorMemberId,
  heritageMode,
  accessibleTrees,
  outgoingInvites,
  incomingInvites,
  memberLinks,
  suggestions,
  mergedMembers,
  virtualMembers,
  virtualById,
  conflicts,
  linkCandidates,
  loading,
  error,
  hubFocusId,
  onFocusChange,
  onSendInvite,
  onAcceptInvite,
  onDeclineInvite,
  onCancelInvite,
  onLinkMembers,
  onAcceptLink,
  onRejectLink,
  onApproveSuggestion,
  onRejectSuggestion,
  onRefresh,
  onSubmitSuggestion,
  onImportJson,
  userDisplayName = 'Contributor',
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaborationRole>('contributor');
  const [inviteBranch, setInviteBranch] = useState<string>('all');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProposedSuggestion | null>(null);
  const [linkTreeA, setLinkTreeA] = useState(ownTreeId);
  const [linkMemberA, setLinkMemberA] = useState('');
  const [linkTreeB, setLinkTreeB] = useState('');
  const [linkMemberB, setLinkMemberB] = useState('');
  const [hubLayout, setHubLayout] = useState<TreeLayout>('mergedRoots');
  const [suggestBio, setSuggestBio] = useState('');
  const [suggestTargetTreeId, setSuggestTargetTreeId] = useState('');
  const [suggestTargetMemberId, setSuggestTargetMemberId] = useState('');
  const [suggestSending, setSuggestSending] = useState(false);

  const sourceBadges = useMemo(() => {
    const map: Record<string, string> = {};
    for (const vm of virtualMembers) {
      map[vm.virtualId] = sourceBadgeForMember(vm);
    }
    return map;
  }, [virtualMembers]);

  const sharedTrees = accessibleTrees.filter((t) => !t.isOwnTree);
  const pendingLinks = memberLinks.filter((l) => l.status === 'pending');
  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');
  const focusId = hubFocusId || mergedMembers[0]?.id || '';

  const membersForSuggestionLookup = useMemo(() => {
    const all: FamilyMember[] = [];
    for (const t of accessibleTrees) all.push(...t.members);
    return all;
  }, [accessibleTrees]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const branch = inviteBranch === 'all' ? undefined : inviteBranch;
    const { inviteUrl } = await onSendInvite(inviteEmail.trim(), inviteRole, branch);
    const body = `You're invited to collaborate on our family tree in Kith & Kin.\n\nOpen this link to accept:\n${inviteUrl}`;
    await navigator.clipboard.writeText(body);
    setInviteCopied(true);
    setInviteEmail('');
    setTimeout(() => setInviteCopied(false), 3000);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTreeA || !linkMemberA || !linkTreeB || !linkMemberB) return;
    await onLinkMembers(linkTreeA, linkMemberA, linkTreeB, linkMemberB);
    setLinkMemberA('');
    setLinkMemberB('');
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportJson) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as FamilyMember[];
        if (Array.isArray(parsed)) onImportJson(parsed);
      } catch {
        /* ignore invalid json */
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectedVirtual = focusId ? virtualById.get(focusId) : null;

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

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestTargetTreeId || !suggestTargetMemberId || !suggestBio.trim()) return;
    const target = contributorTargets.find(
      (t) => t.treeId === suggestTargetTreeId && t.memberId === suggestTargetMemberId
    );
    if (!target) return;
    setSuggestSending(true);
    try {
      await onSubmitSuggestion(suggestTargetTreeId, userDisplayName, {
        type: 'edit_member',
        memberId: suggestTargetMemberId,
        description: `Suggested biography update for ${target.member.firstName} ${target.member.lastName}`,
        suggestedData: {
          member: { ...target.member, biography: suggestBio.trim() },
        },
      });
      setSuggestBio('');
      setSuggestTargetMemberId('');
    } finally {
      setSuggestSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#2D2926] flex items-center gap-2">
            <GitBranch className="w-6 h-6" />
            Collaboration Hub
          </h2>
          <p className="text-sm text-[#7A7570] mt-1 max-w-2xl">
            Your personal tree stays on the other tabs. Here, trees you can access merge into one
            expanded family view at link points.
          </p>
        </div>
        {incomingInvites.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
            <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
            {incomingInvites.length} pending invite{incomingInvites.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Access panel */}
        <aside className="xl:col-span-3 space-y-4">
          <section className="bg-white border border-[#E5E1DA] rounded-xl p-4 space-y-3">
            <h3 className="font-serif font-bold text-[#2D2926] flex items-center gap-2">
              <Users className="w-4 h-4" /> Trees in this view
            </h3>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#A8A29E]" />
            ) : (
              <ul className="space-y-2 text-sm">
                {accessibleTrees.map((t) => (
                  <li
                    key={t.treeId}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E1DA]"
                  >
                    <span className="font-medium text-[#2D2926] truncate">
                      {t.isOwnTree ? 'My tree' : t.ownerName}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-[#7A7570] shrink-0">
                      {t.role}
                    </span>
                  </li>
                ))}
                {sharedTrees.length === 0 && (
                  <p className="text-xs text-[#7A7570] italic">
                    No shared trees yet. Invite a relative below.
                  </p>
                )}
              </ul>
            )}
          </section>

          <section className="bg-white border border-[#E5E1DA] rounded-xl p-4 space-y-3">
            <h3 className="font-serif font-bold text-[#2D2926] flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Invite someone
            </h3>
            <form onSubmit={handleInvite} className="space-y-3 text-sm">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Relative's email"
                className="w-full border border-[#E5E1DA] rounded-lg px-3 py-2"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as CollaborationRole)}
                className="w-full border border-[#E5E1DA] rounded-lg px-3 py-2"
              >
                <option value="viewer">View only</option>
                <option value="contributor">Suggest changes</option>
                <option value="editor">Edit branch</option>
              </select>
              <select
                value={inviteBranch}
                onChange={(e) => setInviteBranch(e.target.value)}
                className="w-full border border-[#E5E1DA] rounded-lg px-3 py-2"
              >
                <option value="all">Entire tree</option>
                {ownMembers
                  .filter((m) => m.childrenIds.length > 0)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      Branch from {m.firstName} {m.lastName}
                    </option>
                  ))}
              </select>
              <button
                type="submit"
                className="w-full py-2.5 bg-[#2D2926] text-white rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                {inviteCopied ? 'Copied to clipboard!' : 'Send invite link'}
              </button>
            </form>
            {outgoingInvites.length > 0 && (
              <div className="pt-2 border-t border-[#E5E1DA] space-y-2">
                <p className="text-[10px] font-bold uppercase text-[#7A7570]">Pending sent</p>
                {outgoingInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between text-xs gap-2"
                  >
                    <span className="truncate">{inv.inviteeEmail}</span>
                    <button
                      type="button"
                      onClick={() => onCancelInvite(inv.id)}
                      className="text-red-600 hover:underline shrink-0"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {incomingInvites.length > 0 && (
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <h3 className="font-serif font-bold text-amber-900">Invites for you</h3>
              {incomingInvites.map((inv) => (
                <div key={inv.id} className="text-sm space-y-2 p-2 bg-white rounded-lg border border-amber-100">
                  <p>
                    <strong>{inv.invitedByName}</strong> invited you to{' '}
                    <strong>{inv.treeName}</strong> as {inv.role}.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onAcceptInvite(inv.id)}
                      className="flex-1 py-1.5 bg-green-700 text-white rounded font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeclineInvite(inv.id)}
                      className="flex-1 py-1.5 border border-[#E5E1DA] rounded font-bold text-xs"
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
              <Link2 className="w-4 h-4" /> Link same person
            </h3>
            <p className="text-xs text-[#7A7570]">
              Connect matching people across trees so branches fold together here.
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
                    {t.isOwnTree ? 'My tree' : t.ownerName}
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
                      {t.isOwnTree ? 'My tree' : t.ownerName}
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
                className="w-full py-2 bg-[#2D2926] text-white rounded-lg text-sm font-semibold"
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
                      onLinkMembers(c.treeAId, c.memberAId, c.treeBId, c.memberBId)
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
                      onClick={() => onAcceptLink(link.id)}
                      className="flex-1 py-1 bg-green-700 text-white rounded"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectLink(link.id)}
                      className="flex-1 py-1 border rounded"
                    >
                      Reject
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {onImportJson && (
            <section className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-bold text-[#2D2926] flex items-center gap-2">
                <FileUp className="w-4 h-4" /> Import branch (fallback)
              </h3>
              <p className="text-xs text-[#7A7570]">
                For relatives not on the app yet — import their JSON export into your tree, then
                link the shared person.
              </p>
              <label className="block">
                <span className="sr-only">Import JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonImport}
                  className="text-xs w-full"
                />
              </label>
              <button
                type="button"
                onClick={() => downloadFamilyJson(ownMembers, 'my_tree_export.json')}
                className="text-xs text-[#2D2926] underline"
              >
                Download my tree JSON instead
              </button>
            </section>
          )}
        </aside>

        {/* Merged tree */}
        <div className="xl:col-span-9 space-y-4">
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
                    {!selectedVirtual.isEditable && s.role === 'viewer' ? ' (read-only)' : ''}
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
              <p>Add people to your tree or accept an invite to see the expanded family view here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions queue */}
      {contributorTargets.length > 0 && (
        <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
          <h3 className="font-serif font-bold text-indigo-900">Propose a change</h3>
          <p className="text-sm text-indigo-800">
            You can suggest edits to trees shared with you. The owner reviews and approves them
            below.
          </p>
          <form onSubmit={handleSubmitSuggestion} className="grid sm:grid-cols-2 gap-3 text-sm">
            <select
              value={suggestTargetMemberId ? `${suggestTargetTreeId}:${suggestTargetMemberId}` : ''}
              onChange={(e) => {
                const [tid, mid] = e.target.value.split(':');
                setSuggestTargetTreeId(tid);
                setSuggestTargetMemberId(mid);
              }}
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
              disabled={suggestSending}
              className="sm:col-span-2 py-2.5 bg-indigo-700 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {suggestSending ? 'Sending…' : 'Submit suggestion'}
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
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-[#7A7570] hover:text-[#2D2926]"
          >
            Refresh
          </button>
        </div>

        {suggestions.length === 0 ? (
          <p className="text-sm text-[#7A7570] italic text-center py-6">
            Contributors can propose changes to trees they access. You approve them here — edits
            apply to the owning tree.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                className={`border rounded-xl p-4 text-sm ${
                  sug.status === 'pending'
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-[#E5E1DA]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-bold">{sug.description}</span>
                  <span className="text-[10px] uppercase font-bold text-[#7A7570]">
                    {sug.status}
                  </span>
                </div>
                <p className="text-xs text-[#7A7570]">
                  By {sug.author} · {sug.type.replace('_', ' ')}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSuggestion(sug)}
                    className="px-3 py-1.5 border rounded text-xs font-bold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> Review
                  </button>
                  {sug.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => onApproveSuggestion(sug)}
                        className="px-3 py-1.5 bg-green-700 text-white rounded text-xs font-bold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onRejectSuggestion(sug.id)}
                        className="px-3 py-1.5 border border-red-200 text-red-700 rounded text-xs font-bold"
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
            <p className="text-sm">{selectedSuggestion.description}</p>
            <SuggestionDiff sug={selectedSuggestion} members={membersForSuggestionLookup} />
            {selectedSuggestion.status === 'pending' && (
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onRejectSuggestion(selectedSuggestion.id);
                    setSelectedSuggestion(null);
                  }}
                  className="px-4 py-2 border rounded text-sm"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onApproveSuggestion(selectedSuggestion);
                    setSelectedSuggestion(null);
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
