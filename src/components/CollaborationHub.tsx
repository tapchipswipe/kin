/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FamilyMember, ProposedSuggestion, CollaborationSession, MediaAttachment } from '../types';
import { 
  Users, 
  Share2, 
  Check, 
  X, 
  Trash2, 
  Eye, 
  Layers, 
  UserPlus, 
  FileCheck, 
  UserCheck, 
  Lock, 
  ExternalLink,
  ChevronRight,
  Clipboard,
  ShieldAlert,
  User,
  Plus
} from 'lucide-react';

interface CollaborationHubProps {
  members: FamilyMember[];
  suggestions: ProposedSuggestion[];
  session: CollaborationSession;
  onChangeSession: (session: CollaborationSession) => void;
  onApproveSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  onClearSuggestions: () => void;
}

export const CollaborationHub: React.FC<CollaborationHubProps> = ({
  members,
  suggestions,
  session,
  onChangeSession,
  onApproveSuggestion,
  onRejectSuggestion,
  onClearSuggestions,
}) => {
  // Share setup states
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'guest_contributor'>('guest_contributor');
  const [inviteBranch, setInviteBranch] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // Active review suggestion (diff modal)
  const [selectedSuggestion, setSelectedSuggestion] = useState<ProposedSuggestion | null>(null);

  // Generate simulated invitation
  const handleGenerateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) return;

    const branchName = inviteBranch === 'all' 
      ? 'Entire Family Tree' 
      : members.find(m => m.id === inviteBranch)?.lastName + ' Descent Line';

    // Simulated URL with query params
    const mockUrl = `${window.location.origin}${window.location.pathname}?guest=${encodeURIComponent(inviteName)}&role=${inviteRole}&branch=${inviteBranch}`;
    setGeneratedLink(mockUrl);
    setCopiedLink(true);

    const shareBody = `Kith & Kin Invitation Details:\n-------------------------------\nHello, I invite you to contribute to our digital family tree!\nName: ${inviteName}\nPermission Scope: ${inviteRole === 'editor' ? 'Co-Editor (Direct Save)' : 'Contributor (Propose suggestions for owner approval)'}\nAccess Limit: ${branchName}\nLet's build our heritage together!`;
    navigator.clipboard.writeText(shareBody).then(() => {
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  // Switch to simulated user session directly in the browser
  const handleSimulateUser = (name: string, role: 'owner' | 'editor' | 'guest_contributor', branchId?: string) => {
    onChangeSession({
      currentUser: name,
      role: role,
      allowedBranchId: branchId === 'all' ? undefined : branchId
    });
  };

  // Find target member reference for a suggestion 
  const getTargetMember = (sug: ProposedSuggestion) => {
    if (!sug.memberId) return null;
    return members.find(m => m.id === sug.memberId);
  };

  // Helper function to render visual diff between current state and suggested change
  const renderVisualDiff = (sug: ProposedSuggestion) => {
    const original = getTargetMember(sug);
    const suggested = sug.suggestedData.member;

    if (sug.type === 'add_member') {
      return (
        <div className="space-y-3 bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E1DA]">
          <h4 className="text-xs font-bold text-[#2D2926] uppercase">PROPOSED NEW MEMBER REGISTRATION</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-[#A8A29E] block">First Name</span>
              <span className="font-bold text-[#2D2926]">{suggested?.firstName || 'Unavailable'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#A8A29E] block">Last Name</span>
              <span className="font-bold text-[#2D2926]">{suggested?.lastName || 'Unavailable'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#A8A29E] block">Birth Details</span>
              <span className="font-medium text-[#2D2926]">{suggested?.birthDate || '????'} &bull; {suggested?.birthPlace || 'Unknown Place'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#A8A29E] block">Life Calling & Occupation</span>
              <span className="font-medium text-[#2D2926]">{suggested?.occupation || 'Unspecified'}</span>
            </div>
          </div>
          {suggested?.biography && (
            <div className="pt-2 border-t border-[#E5E1DA] text-xs">
              <span className="text-[10px] text-[#A8A29E] block">Biography Summary</span>
              <p className="text-[#7A7570] italic mt-1 leading-relaxed">"{suggested.biography}"</p>
            </div>
          )}
        </div>
      );
    }

    if (sug.type === 'edit_member' && original && suggested) {
      // Look for modified fields
      const changes: { field: string; from: string; to: string }[] = [];
      
      Object.keys(suggested).forEach(key => {
        const k = key as keyof FamilyMember;
        const currentVal = original[k];
        const suggestedVal = suggested[k];

        if (JSON.stringify(currentVal) !== JSON.stringify(suggestedVal)) {
          if (k === 'biography') {
            changes.push({
              field: 'Biography Story',
              from: (currentVal as string) || '(Empty)',
              to: (suggestedVal as string) || '(Empty)'
            });
          } else if (k === 'occupation') {
            changes.push({
              field: 'Occupation / Line of Work',
              from: (currentVal as string) || '(Empty)',
              to: (suggestedVal as string) || '(Empty)'
            });
          } else if (k === 'lastName') {
            changes.push({
              field: 'Last Name',
              from: (currentVal as string) || '(Empty)',
              to: (suggestedVal as string) || '(Empty)'
            });
          } else if (k === 'firstName') {
            changes.push({
              field: 'First Name',
              from: (currentVal as string) || '(Empty)',
              to: (suggestedVal as string) || '(Empty)'
            });
          }
        }
      });

      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-[#2D2926]" />
            </span>
            <span className="text-xs font-bold text-[#2D2926]">
              Target: {original.firstName} {original.lastName}
            </span>
          </div>

          <div className="space-y-3">
            {changes.map((ch, idx) => (
              <div key={idx} className="border border-[#E5E1DA] rounded-lg overflow-hidden text-xs">
                <div className="bg-[#FAF9F6] border-b border-[#E5E1DA] px-3 py-1.5 font-bold text-[#2D2926]">
                  {ch.field} Changes
                </div>
                <div className="grid grid-cols-2 divide-x divide-[#E5E1DA]">
                  <div className="p-3 text-[#A8A29E] bg-red-50/20 text-left">
                    <span className="text-[10px] uppercase font-bold text-red-500 block mb-1">Previous</span>
                    <p className="line-through">{ch.from}</p>
                  </div>
                  <div className="p-3 text-[#2D2926] bg-green-50/20 text-left">
                    <span className="text-[10px] uppercase font-bold text-green-600 block mb-1">Proposed Addition</span>
                    <p className="font-medium text-[#2D2926] bg-green-100/40 p-1 rounded border border-green-200/55">{ch.to}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (sug.type === 'add_event') {
      const evt = sug.suggestedData.event;
      return (
        <div className="space-y-3 bg-[#FAF9F6] p-4 rounded-xl border border-[#E5E1DA]">
          <h4 className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1">
            <Layers className="w-4 h-4" /> PROPOSED CHRONICLE EVENT FOR {original ? `${original.firstName} ${original.lastName}` : 'Index'}
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <span className="text-[10px] text-[#A8A29E] block">Year Occurred</span>
              <span className="font-bold font-mono text-[#2D2926]">{evt?.year || '????'}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#A8A29E] block">Event Title</span>
              <span className="font-bold text-[#2D2926]">{evt?.title || 'Unrecorded Title'}</span>
            </div>
            {evt?.location && (
              <div className="col-span-2">
                <span className="text-[10px] text-[#A8A29E] block">Location</span>
                <span className="font-medium text-[#2D2926]">{evt.location}</span>
              </div>
            )}
            {evt?.description && (
              <div className="col-span-2 pt-1 border-t border-[#E5E1DA]">
                <span className="text-[10px] text-[#A8A29E] block font-semibold mb-0.5">Narrative Story Summary</span>
                <p className="text-[#7A7570] italic">"{evt.description}"</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="text-xs text-[#7A7570] italic">
        General attachment proposed or details unresolvable. Read the author's outline below for insights.
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      
      {/* LEFT: Shares Generator & Workspace Roles Selector */}
      <div className="md:col-span-6 space-y-6">
        
        {/* 1. Co-editor Invites Dispatcher */}
        <section className="bg-white border border-[#E5E1DA] rounded-xl p-5 text-left space-y-4">
          <div className="space-y-1">
            <h3 className="font-serif font-bold text-lg text-[#2D2926] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#2D2926]" /> Invite Co-Editors & Contributors
            </h3>
            <p className="text-xs text-[#7A7570]">
              Create authorized credentials for relatives. Grant view options, specific lineage branch restrictions, or suggestion submission permissions.
            </p>
          </div>

          <form onSubmit={handleGenerateInvite} className="space-y-4 text-xs pt-2">
            <div>
              <label className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">
                Relative Name *
              </label>
              <input
                type="text"
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Sarah Sterling, Robert Jr"
                className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#2D2926]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">
                  Access Level Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-3 py-2 outline-none"
                >
                  <option value="guest_contributor">Suggestions-Only Contributor</option>
                  <option value="editor">Full Co-Editor</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">
                  Lineage Filter Constraint
                </label>
                <select
                  value={inviteBranch}
                  onChange={(e) => setInviteBranch(e.target.value)}
                  className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-3 py-2 outline-none"
                >
                  <option value="all">Entire Index (Uncapped)</option>
                  {members.filter(m => m.childrenIds.length > 0).map(m => (
                    <option key={m.id} value={m.id}>
                      Descendants of {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-10 bg-[#2D2926] hover:bg-[#1C1A18] text-white flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Generate Invitation Packet
            </button>
          </form>

          {/* Invitation outcome link display */}
          {generatedLink && (
            <div className="p-3 bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg mt-3 space-y-1.5 text-[11px] relative">
              <div className="flex justify-between items-center text-[#7A7570] font-bold uppercase tracking-wider text-[9px]">
                <span>PRIVATE INVITATION PACKET COPIED!</span>
                <span className="flex items-center gap-1 text-green-700">
                  <Check className="w-3 h-3" /> Ready
                </span>
              </div>
              <p className="text-[#2D2926] leading-relaxed">
                We generated a simulated secure URL token and copied a beautiful invite card to your clipboard! Share it with <strong>{inviteName}</strong>. 
              </p>
              
              {/* Short simulation triggers */}
              <div className="pt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSimulateUser(inviteName, inviteRole, inviteBranch)}
                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-amber-700" />
                  Simulate logging in as {inviteName}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 2. active active simulation credentials box */}
        <section className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-5 text-left space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#2D2926] uppercase tracking-wider flex items-center gap-1">
              <Users className="w-4 h-4 text-[#2D2926]" /> Active Platform Collaborator Sandbox
            </h4>
            <p className="text-[11px] text-[#7A7570]">
              To experience the collaborative workflow in this offline browser mode, switch your acting user role below. Propose additions as a contributor, then swap back to <strong>Owner</strong> to review them!
            </p>
          </div>

          <div className="space-y-2 pt-1.5">
            {/* Owner Button */}
            <button
              onClick={() => handleSimulateUser('Owner (You)', 'owner')}
              className={`w-full p-3.5 rounded-lg border text-left flex justify-between items-center transition-all cursor-pointer ${
                session.role === 'owner'
                  ? 'bg-white border-[#2D2926] ring-1 ring-[#2D2926] font-bold text-[#2D2926]'
                  : 'bg-white border-[#E5E1DA] hover:bg-[#FAF9F6] text-[#7A7570]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  O
                </div>
                <div>
                  <span className="text-xs block font-bold text-[#2D2926]">Site Administrator (Primary Owner)</span>
                  <span className="text-[10px] text-[#A8A29E] font-medium leading-none">Uncapped full write privileges & review board inbox accesses</span>
                </div>
              </div>
              {session.role === 'owner' && <span className="text-xs px-2 py-0.5 bg-[#2D2926] text-[#FAF9F6] rounded font-bold uppercase tracking-wider">Active</span>}
            </button>

            {/* Simulated guest contributor: Sarah */}
            <button
              onClick={() => handleSimulateUser('Cousin Sarah', 'guest_contributor')}
              className={`w-full p-3.5 rounded-lg border text-left flex justify-between items-center transition-all cursor-pointer ${
                session.role === 'guest_contributor' && session.currentUser === 'Cousin Sarah'
                  ? 'bg-white border-[#2D2926] ring-1 ring-[#2D2926] font-bold text-[#2D2926]'
                  : 'bg-white border-[#E5E1DA] hover:bg-[#FAF9F6] text-[#7A7570]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-400 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  S
                </div>
                <div>
                  <span className="text-xs block font-bold text-[#2D2926]">Cousin Sarah (Guest Contributor)</span>
                  <span className="text-[10px] text-[#A8A29E] font-medium leading-none">Access level: Propose structural suggestions only</span>
                </div>
              </div>
              {session.role === 'guest_contributor' && session.currentUser === 'Cousin Sarah' && (
                <span className="text-xs px-2 py-0.5 bg-[#2D2926] text-[#FAF9F6] rounded font-bold uppercase tracking-wider">Active</span>
              )}
            </button>

            {/* Simulated guest editor: Uncle Robert */}
            <button
              onClick={() => handleSimulateUser('Uncle Robert', 'editor')}
              className={`w-full p-3.5 rounded-lg border text-left flex justify-between items-center transition-all cursor-pointer ${
                session.role === 'editor' && session.currentUser === 'Uncle Robert'
                  ? 'bg-white border-[#2D2926] ring-1 ring-[#2D2926] font-bold text-[#2D2926]'
                  : 'bg-white border-[#E5E1DA] hover:bg-[#FAF9F6] text-[#7A7570]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-400 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  R
                </div>
                <div>
                  <span className="text-xs block font-bold text-[#2D2926]">Uncle Robert (Co-Editor)</span>
                  <span className="text-[10px] text-[#A8A29E] font-medium leading-none">Access level: Full direct-save branch permissions</span>
                </div>
              </div>
              {session.role === 'editor' && session.currentUser === 'Uncle Robert' && (
                <span className="text-xs px-2 py-0.5 bg-[#2D2926] text-[#FAF9F6] rounded font-bold uppercase tracking-wider">Active</span>
              )}
            </button>
          </div>
        </section>

      </div>

      {/* RIGHT: Suggestions Drawer & Diffs Checker */}
      <div className="md:col-span-6 space-y-6 text-left">
        
        <section className="bg-white border border-[#E5E1DA] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E1DA] pb-3">
            <div className="space-y-0.5">
              <h3 className="font-serif font-bold text-lg text-[#2D2926] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#2D2926]" /> Proposed Suggestions Board
              </h3>
              <p className="text-xs text-[#7A7570]">
                {suggestions.filter(s => s.status === 'pending').length} suggestions waiting for owner evaluation.
              </p>
            </div>
            {session.role === 'owner' && suggestions.length > 0 && (
              <button
                onClick={onClearSuggestions}
                className="text-[10px] uppercase font-bold tracking-wider text-rose-600 hover:underline cursor-pointer"
              >
                Clear Suggestions list
              </button>
            )}
          </div>

          {/* Suggestions List Container */}
          {suggestions.length > 0 ? (
            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              {suggestions.map((sug) => {
                const isPending = sug.status === 'pending';
                return (
                  <div 
                    key={sug.id}
                    className={`border rounded-xl p-4 space-y-3 transition-colors ${
                      isPending 
                        ? 'border-amber-200 bg-amber-50/10' 
                        : sug.status === 'approved' 
                          ? 'border-green-200 bg-green-50/5' 
                          : 'border-[#E5E1DA] bg-stone-50/50'
                    }`}
                  >
                    
                    {/* Upper Metadata Tag bar */}
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          isPending 
                            ? 'bg-amber-500 animate-pulse' 
                            : sug.status === 'approved' 
                              ? 'bg-green-600' 
                              : 'bg-red-500'
                        }`} />
                        <span className="font-bold text-[#2D2926]">By {sug.author}</span>
                        <span className="text-[#A8A29E]">•</span>
                        <span className="text-[#7A7570] font-mono">{new Date(sug.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      
                      <span className={`px-2 py-0.5 text-[8px] tracking-widest font-bold uppercase rounded border ${
                        isPending 
                          ? 'bg-amber-100 text-amber-800 border-amber-200' 
                          : sug.status === 'approved' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {sug.status}
                      </span>
                    </div>

                    {/* Description narration */}
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#2D2926]">
                        {sug.description}
                      </p>
                      {sug.type && (
                        <span className="text-[10px] text-stone-400 capitalize block font-mono">
                          Operation Code: {sug.type.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <button
                        onClick={() => setSelectedSuggestion(sug)}
                        className="px-3 py-1.5 border border-[#E5E1DA] bg-white hover:bg-[#FAF9F6] text-[#2D2926] rounded-md font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Changes & Diffs
                      </button>

                      {isPending && session.role === 'owner' && (
                        <>
                          <button
                            onClick={() => onApproveSuggestion(sug.id)}
                            className="bg-green-700 hover:bg-green-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Merge Edit
                          </button>
                          <button
                            onClick={() => onRejectSuggestion(sug.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] px-3 py-1.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed border-[#E5E1DA] bg-[#FAF9F6]/20 rounded-xl text-stone-400 italic text-xs">
              No suggested additions registered yet on the platform bulletin board. Invite members to write up suggestions!
            </div>
          )}
        </section>

      </div>

      {/* --- Suggested Inspect & Visual Diff Modal Overlay --- */}
      {selectedSuggestion && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-xl border border-[#E5E1DA] max-w-xl w-full overflow-hidden shadow-lg max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 bg-[#FAF9F6] border-b border-[#E5E1DA] flex justify-between items-center">
              <div>
                <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  CRITICAL CODE INSPECTOR
                </span>
                <h3 className="font-serif font-bold text-sm text-[#2D2926] mt-1 leading-snug">
                  Proposed by: {selectedSuggestion.author}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedSuggestion(null)}
                className="text-stone-500 hover:text-[#2D2926]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Container with Diffs */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[60vh]">
              <div className="space-y-1 text-xs">
                <span className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider block">Suggested Summary Justification</span>
                <p className="text-[#2D2926] font-semibold leading-relaxed p-2.5 bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg">
                  "{selectedSuggestion.description}"
                </p>
              </div>

              <div className="border-t border-[#E5E1DA] pt-3">
                {renderVisualDiff(selectedSuggestion)}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-[#E5E1DA] bg-[#FAF9F6] flex justify-between items-center">
              <span className="text-[10px] text-[#7A7570] font-mono">
                Status: {selectedSuggestion.status.toUpperCase()}
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSuggestion(null)}
                  className="px-4 py-2 border border-[#E5E1DA] bg-white text-[#2D2926] rounded-md font-bold text-xs hover:bg-[#FAF9F6] cursor-pointer"
                >
                  Close Inspector
                </button>

                {selectedSuggestion.status === 'pending' && session.role === 'owner' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onApproveSuggestion(selectedSuggestion.id);
                        setSelectedSuggestion(null);
                      }}
                      className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-md font-bold text-xs cursor-pointer"
                    >
                      Merge Recommendation
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
