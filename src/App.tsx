/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FamilyMember, MediaAttachment, ProposedSuggestion, CollaborationSession } from './types';
import { STERLING_DEMO_DATA } from './demoData';
import { TreeCanvas } from './components/TreeCanvas';
import { MemberIndex } from './components/MemberIndex';
import { LineageTimeline } from './components/LineageTimeline';
import { MemberForm } from './components/MemberForm';
import { MediaGallery } from './components/MediaGallery';
import { CollaborationHub } from './components/CollaborationHub';
import { RecentlyVisited } from './components/RecentlyVisited';
import { LineageStats } from './components/LineageStats';
import { LineageMap } from './components/LineageMap';
import { removeMemberCleanly, findSiblings, getEraLabel } from './utils';
import { 
  Network, 
  Users, 
  History, 
  FileDown, 
  FileUp, 
  RefreshCw, 
  Trash2, 
  Plus, 
  MapPin, 
  Briefcase, 
  Heart, 
  Award,
  ChevronRight,
  BookOpen,
  Lock,
  Share2,
  PieChart,
  Globe,
  Printer
} from 'lucide-react';
import { motion } from 'motion/react';

const DEFAULT_MEDIA_SEEDS: Record<string, MediaAttachment[]> = {
  '1': [
    {
      id: 'med_seed_1',
      name: 'Stonemason Tool Chest Ledger',
      type: 'document',
      url: 'data:text/plain;base64,MTkwOCBNYXVyZXRhbmlhIHBhc3NlbndlciBsaXN0LCBBcnRodXIgU3RlcmxpbmcsIGFnZSAyMywgbWFzdGVyIHN0b25lbWFzb24gZnJvbSBFZGluYnVyZ2gu',
      uploadedAt: 'Jun 12, 1908',
      size: '2.4 KB',
      notes: 'Handwritten workshop catalog showing Arthur\'s first tool chest index carried on the SS Mauretania ship.',
      associatedEventId: 'e1_1'
    },
    {
      id: 'med_seed_2',
      name: 'Margaret & Arthur Hanover Wedding Scans',
      type: 'image',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="100%" height="100%"><rect width="200" height="150" fill="%23FAF9F6"/><rect x="20" y="20" width="160" height="110" fill="%23E5E1DA" stroke="%232D2926" stroke-width="1"/><circle cx="100" cy="75" r="30" fill="none" stroke="%237A7570" stroke-width="2"/><text x="100" y="79" font-family="serif" font-size="10" font-weight="bold" fill="%232D2926" text-anchor="middle">MARRIAGE REGISTRY</text><line x1="40" y1="110" x2="160" y2="110" stroke="%237A7570" stroke-dasharray="2,2"/><text x="100" y="122" font-size="6" fill="%237A7570" text-anchor="middle">Arthur &amp; Margaret &bull; Boston 1910</text></svg>',
      uploadedAt: 'Sep 18, 1910',
      size: '42 KB',
      notes: 'Scanned from the original family Bible page, with signatures from Reverend J. Henderson.',
      associatedEventId: 'e1_2'
    }
  ],
  '12': [
    {
      id: 'med_seed_3',
      name: 'Sterling Digital Archiving Plan',
      type: 'document',
      url: 'data:text/plain;base64,MTUwMCBob3VzZWhvbGQgcGhvdG9ncmFwaHMgYW5kIHBhcGVyIGNoYXJ0cyBzY2FubmVkIGF0IDYwMGRwaSBmb3IgcGVyc2lzdGVudCBjbG91ZCByZWdpc3RyeS4=',
      uploadedAt: 'Dec 4, 2020',
      size: '12.8 KB',
      notes: 'Strategic spreadsheet inventory catalog of scanned boxes of photographic plates, diaries, and census forms collected by James in 2020.',
      associatedEventId: 'e12_2'
    }
  ],
  '13': [
    {
      id: 'med_seed_4',
      name: 'Mount Rainier Mycorrhizal Mycology Study',
      type: 'image',
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="100%" height="100%"><rect width="200" height="150" fill="%23FAF9F6"/><path d="M 30,120 L 70,60 L 110,120 Z" fill="%23E5E1DA" stroke="%237A7570"/><path d="M 90,120 L 130,50 L 170,120 Z" fill="%23FAF9F6" stroke="%232D2926"/><circle cx="130" cy="50" r="4" fill="%239ccc65"/><text x="100" y="25" font-family="monospace" font-size="8" fill="%237A7570" text-anchor="middle">FUNGAL FOREST NETWORK</text><path d="M 60,110 Q 100,140 140,110" fill="none" stroke="%239ccc65" stroke-width="2" stroke-dasharray="3,1"/></svg>',
      uploadedAt: 'Apr 11, 2012',
      size: '18 KB',
      notes: 'Reproduction of the symbiotic network drawing Clara outlined on Mount Rainier old-growth soil cores.',
      associatedEventId: 'e13_1'
    }
  ]
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('family_lineage_auth') === 'true';
  });

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('family_lineage_auth', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.setItem('family_lineage_auth', 'false');
  };

  // --- 1. Persistent State Engine ---
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('family_lineage_dataset');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to restore lineage cache:', err);
      }
    }
    return [];
  });

  // Active Selected / Highlighted Member
  const [focusId, setFocusId] = useState<string>(() => {
    const defaultFocus = ''; 
    const saved = localStorage.getItem('family_lineage_dataset');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as FamilyMember[];
        if (parsed.length > 0) {
          return parsed[0].id;
        }
      } catch { /* ignore */ }
    }
    return defaultFocus;
  });

  // Recently Visited Member IDs Registry
  const [recentlyVisited, setRecentlyVisited] = useState<string[]>(() => {
    const saved = localStorage.getItem('family_lineage_recently_visited');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(id => typeof id === 'string');
        }
      } catch { /* ignore */ }
    }
    return ['12']; // Default James Sterling
  });

  // Track and log recently viewed members (up to latest 5 unique entries)
  useEffect(() => {
    if (!focusId) return;
    setRecentlyVisited((prev) => {
      const filtered = prev.filter((id) => id !== focusId);
      const updated = [focusId, ...filtered].slice(0, 5);
      localStorage.setItem('family_lineage_recently_visited', JSON.stringify(updated));
      return updated;
    });
  }, [focusId]);

  // Peer Simulation State Session info
  const [session, setSession] = useState<CollaborationSession>(() => {
    const saved = localStorage.getItem('family_lineage_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return {
      currentUser: 'Owner (You)',
      role: 'owner'
    };
  });

  // Pending Peer Suggestions Buffer list
  const [suggestions, setSuggestions] = useState<ProposedSuggestion[]>(() => {
    const saved = localStorage.getItem('family_lineage_suggestions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return [
      {
        id: 'sug_seed_1',
        type: 'edit_member',
        status: 'pending',
        author: 'Cousin Sarah',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        memberId: '12', // James Sterling
        description: 'Update James\' biography with his latest computer engineering publication.',
        suggestedData: {
          member: {
            id: '12',
            biography: 'James is a technology enthusiast who spent much of his career building web platforms. Prompted by his mother Sarah\'s historical tales and his father Robert\'s box of old letters, James took up genealogy as a passionate pursuit. Recently, he successfully published an award-winning article in the International Genealogy Tech Journal on digital tree preservation.',
          }
        }
      },
      {
        id: 'sug_seed_2',
        type: 'add_member',
        status: 'pending',
        author: 'Uncle Robert',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        description: 'Add a proposed new addition, Margaret Junior Wood, born to our Manhattan descendants.',
        suggestedData: {
          member: {
            id: 'sug_new_1',
            firstName: 'Margaret Junior',
            lastName: 'Wood',
            gender: 'female',
            birthDate: '2026-02-14',
            birthPlace: 'New York, NY',
            isDeceased: false,
            biography: 'Born to Charles and Beatrice\'s descendants. A beautiful new addition to the Wood side of the family.',
            avatarUrl: '#ec407a',
            spouseIds: [],
            childrenIds: [],
            events: []
          }
        }
      }
    ];
  });

  // Current active tab: 'tree' | 'index' | 'timeline' | 'collaboration' | 'analytics' | 'map'
  const [activeTab, setActiveTab] = useState<'tree' | 'index' | 'timeline' | 'collaboration' | 'analytics' | 'map'>('tree');

  // Form togglers
  const [showForm, setShowForm] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [prefillRelation, setPrefillRelation] = useState<{
    memberId: string;
    type: 'father' | 'mother' | 'spouse' | 'child';
  } | null>(null);

  // File picker reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save to LocalStorage automatically on database mutations
  useEffect(() => {
    localStorage.setItem('family_lineage_dataset', JSON.stringify(members));
  }, [members]);

  // Find the focus member detailed profile
  const activeFocusMember = useMemo(() => {
    return members.find((m) => m.id === focusId) || members[0] || null;
  }, [members, focusId]);

  // Adjust focus ID when members count changes (e.g., if focus member deleted)
  useEffect(() => {
    if (members.length > 0 && !members.find((m) => m.id === focusId)) {
      setFocusId(members[0].id);
    }
  }, [members, focusId]);

  // --- 2. Advanced Bidirectional Integrity Checks ---
  /**
   * Enforces and synchronizes bilateral relationship bindings.
   * If member X points to Y as father, Y must record X as child.
   */
  const synchronizeAllRelationships = (list: FamilyMember[]): FamilyMember[] => {
    const map = new Map<string, FamilyMember>(
      list.map((m) => [
        m.id,
        {
          ...m,
          spouseIds: [...(m.spouseIds || [])],
          childrenIds: [...(m.childrenIds || [])],
          fatherId: m.fatherId,
          motherId: m.motherId,
        },
      ])
    );

    for (const [id, m] of map.entries()) {
      // 1. Sync Father -> Child
      if (m.fatherId) {
        const father = map.get(m.fatherId);
        if (father && !father.childrenIds.includes(m.id)) {
          father.childrenIds.push(m.id);
        }
      }
      
      // 2. Sync Mother -> Child
      if (m.motherId) {
        const mother = map.get(m.motherId);
        if (mother && !mother.childrenIds.includes(m.id)) {
          mother.childrenIds.push(m.id);
        }
      }

      // 3. Sync Child -> Parent
      for (const childId of m.childrenIds) {
        const child = map.get(childId);
        if (child) {
          if (m.gender === 'male' && child.fatherId !== m.id) {
            child.fatherId = m.id;
          } else if (m.gender === 'female' && child.motherId !== m.id) {
            child.motherId = m.id;
          }
        }
      }

      // 4. Sync Spouses mutually
      for (const spouseId of m.spouseIds) {
        const spouse = map.get(spouseId);
        if (spouse && !spouse.spouseIds.includes(m.id)) {
          spouse.spouseIds.push(m.id);
        }
      }
    }

    return Array.from(map.values());
  };

  // --- 2.5 Branch Constraints & Collaboration Helpers ---
  const isMemberInAllowedBranch = (memberId: string): boolean => {
    if (!session.allowedBranchId) return true; // Uncapped entire tree
    
    const rootId = session.allowedBranchId;
    if (memberId === rootId) return true;

    // Fast parentage trace
    const traceUpIsDescendant = (id: string, visited: string[] = []): boolean => {
      if (visited.includes(id)) return false; // Loop guard
      const m = members.find(x => x.id === id);
      if (!m) return false;
      if (m.fatherId === rootId || m.motherId === rootId) return true;
      
      const parts: string[] = [];
      if (m.fatherId) parts.push(m.fatherId);
      if (m.motherId) parts.push(m.motherId);

      return parts.some(p => traceUpIsDescendant(p, [...visited, id]));
    };

    return traceUpIsDescendant(memberId);
  };

  const handleUpdateMemberMedia = (memberId: string, updatedMediaList: MediaAttachment[]) => {
    setMembers((prev) => {
      const nextList = prev.map((m) => {
        if (m.id === memberId) {
          return {
            ...m,
            media: updatedMediaList
          };
        }
        return m;
      });
      return nextList;
    });
  };

  const handleApproveSuggestion = (id: string) => {
    const sug = suggestions.find((s) => s.id === id);
    if (!sug) return;

    setMembers((prev) => {
      let nextList = [...prev];
      if (sug.type === 'add_member') {
        const newMember = sug.suggestedData.member as FamilyMember;
        if (!nextList.some(m => m.id === newMember.id)) {
          nextList.push({
            ...newMember,
            id: newMember.id.startsWith('sug_new') ? 'mem_' + Date.now() : newMember.id
          });
        }
      } else if (sug.type === 'edit_member') {
        const update = sug.suggestedData.member;
        const index = nextList.findIndex((m) => m.id === sug.memberId);
        if (index >= 0 && update) {
          nextList[index] = {
            ...nextList[index],
            ...update
          };
        }
      } else if (sug.type === 'add_event') {
        const newEvt = sug.suggestedData.event;
        const index = nextList.findIndex((m) => m.id === sug.memberId);
        if (index >= 0 && newEvt) {
          nextList[index] = {
            ...nextList[index],
            events: [...(nextList[index].events || []), newEvt]
          };
        }
      }
      return synchronizeAllRelationships(nextList);
    });

    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'approved' as const } : s))
    );
  };

  const handleRejectSuggestion = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'rejected' as const } : s))
    );
  };

  const handleClearSuggestions = () => {
    setSuggestions([]);
  };

  // --- 3. Database Mutations Handlers ---
  const handleSaveMember = (savedMember: FamilyMember) => {
    // INTERCEPT FOR GUEST SUGGESTION MODE
    if (session.role === 'guest_contributor') {
      const isNew = !members.some((m) => m.id === savedMember.id);
      const newSug: ProposedSuggestion = {
        id: 'sug_' + Date.now(),
        type: isNew ? 'add_member' : 'edit_member',
        status: 'pending',
        author: session.currentUser,
        timestamp: new Date().toISOString(),
        memberId: isNew ? undefined : savedMember.id,
        description: isNew 
          ? `Register new relative candidate: "${savedMember.firstName} ${savedMember.lastName}" (${savedMember.gender})`
          : `Update biographical records for ${savedMember.firstName} ${savedMember.lastName}`,
        suggestedData: {
          member: savedMember
        }
      };
      setSuggestions((prev) => [newSug, ...prev]);
      setShowForm(false);
      setEditMemberId(null);
      setPrefillRelation(null);
      alert(`Thank you, ${session.currentUser}! Your change proposal has been cataloged for Site Owner admin review.`);
      return;
    }

    // Direct write for administrators
    if (session.allowedBranchId && !isMemberInAllowedBranch(savedMember.id)) {
      alert(`Invalid Permissions: You are restricted to making tree alterations for descendants of the designated lineage root node.`);
      return;
    }

    setMembers((prev) => {
      let nextList = [...prev];
      const index = nextList.findIndex((m) => m.id === savedMember.id);
      if (index >= 0) {
        nextList[index] = savedMember;
      } else {
        nextList.push(savedMember);
      }
      return synchronizeAllRelationships(nextList);
    });

    setFocusId(savedMember.id);
    setShowForm(false);
    setEditMemberId(null);
    setPrefillRelation(null);
  };

  const handleDeleteMember = (targetId: string) => {
    if (!isMemberInAllowedBranch(targetId)) {
      alert(`Invalid Permissions: This relative is outside your allocated branch assignment.`);
      return;
    }
    setMembers((prev) => removeMemberCleanly(prev, targetId));
    setShowForm(false);
  };

  const handleCreateNewMemberRequest = () => {
    if (session.role === 'guest_contributor' && session.allowedBranchId) {
      alert(`Invalid Permissions: Dynamic registry is limited to editing within your assigned branch constraints.`);
      return;
    }
    setEditMemberId(null);
    setPrefillRelation(null);
    setShowForm(true);
  };

  const handleEditMemberRequest = (id: string) => {
    if (!isMemberInAllowedBranch(id)) {
      alert(`Invalid Permissions: This relative is outside your allocated branch scope.`);
      return;
    }
    setEditMemberId(id);
    setPrefillRelation(null);
    setShowForm(true);
  };

  const handleAddRelativeRequest = (memberId: string, type: 'father' | 'mother' | 'spouse' | 'child') => {
    if (!isMemberInAllowedBranch(memberId)) {
      alert(`Invalid Permissions: Adding relatives to nodes outside your permitted branch is restricted.`);
      return;
    }
    setEditMemberId(null);
    setPrefillRelation({ memberId, type });
    setShowForm(true);
  };

  // --- 4. JSON Import/Export Portability Handles ---
  const handleExportJSON = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(members, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', 'family_lineage.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Export fail:', err);
      alert('Fail to export dynamic JSON catalog structure.');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
          // Perform basic schema validity checks
          setMembers(synchronizeAllRelationships(parsed));
          setFocusId(parsed[0].id);
          alert(`Successfully imported family register containing ${parsed.length} records!`);
        } else {
          alert('Invalid file format. Ensure it is a valid list of family member records.');
        }
      } catch (err) {
        console.error('Import process crash:', err);
        alert('Could not parse JSON structure. Make sure files are not corrupt.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input element
  };

  const handleClearTree = () => {
    if (confirm('CRITICAL WARN: Are you absolutely sure you want to completely clear this lineage chart? Your active cached data will be lost.')) {
      setMembers([]);
      setFocusId('');
      setShowForm(false);
    }
  };

  const handleRestoreDemo = () => {
    if (confirm('Notice: This will completely replace your active lineage with the default 5-generation Sterling Family Demo tree.')) {
      setMembers(STERLING_DEMO_DATA);
      setFocusId('12');
      setShowForm(false);
    }
  };

  // --- 5. Navigation & Sideline Relationships Resolve ---
  const handleSelectMemberFocus = (id: string) => {
    setFocusId(id);
  };

  const handleSelectAndTab = (id: string) => {
    setFocusId(id);
    setActiveTab('tree');
  };

  // Resolve active sideline relationship cards representation
  const activeFather = activeFocusMember?.fatherId ? members.find((m) => m.id === activeFocusMember.fatherId) : null;
  const activeMother = activeFocusMember?.motherId ? members.find((m) => m.id === activeFocusMember.motherId) : null;
  const activeSpouses = activeFocusMember ? members.filter((m) => activeFocusMember.spouseIds.includes(m.id)) : [];
  const activeChildren = activeFocusMember ? members.filter((m) => activeFocusMember.childrenIds.includes(m.id)) : [];
  const activeSiblings = activeFocusMember ? findSiblings(members, activeFocusMember) : [];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center font-sans tracking-tight">
        <div className="bg-white p-8 rounded-2xl border border-[#E5E1DA] shadow-sm max-w-sm w-full text-center space-y-6">
          <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center mx-auto">
            <Heart className="w-5 h-5 text-rose-500 fill-current" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-serif text-[#2D2926] leading-tight">Your Family Archive</h1>
            <p className="text-xs text-[#7A7570] mt-1.5 leading-relaxed">A simple, loving space to record the stories and connections of your ancestors. Start tracing your lineage today.</p>
          </div>
          <button
            onClick={handleLogin}
            className="w-full bg-[#2D2926] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-xs hover:bg-[#1C1A18] transition-colors cursor-pointer"
          >
            Start Your Lineage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#2D2926] flex flex-col font-sans">
      
      {/* 1. MINIMALISTIC Platform NAVIGATION HEADER */}
      <header className="bg-white/80 backdrop-blur-md text-[#2D2926] border-b border-[#E5E1DA] sticky top-0 z-40 select-none animate-fadeIn print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Visual Platform Emblem */}
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[#2D2926] flex items-center justify-center shrink-0">
              <Network className="w-4 h-4 text-white font-bold" />
            </span>
            <div className="text-left">
              <h1 className="text-lg font-semibold tracking-tight text-[#2D2926] leading-tight">
                Kith & Kin
              </h1>
              <p className="text-[10px] text-[#7A7570] font-medium font-mono uppercase tracking-wider">
                Lineage Registry Archive
              </p>
            </div>
          </div>

          {/* Database Control Center Portability Options */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* hidden file trigger */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportJSON} 
              accept=".json" 
              className="hidden" 
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import lineage register from .json file"
              className="px-3.5 py-1.5 bg-[#FAF9F6] border border-[#E5E1DA] hover:bg-[#F5F2EF] text-[#2D2926] font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5 shrink-0 text-[#7A7570]" />
              Import Tree
            </button>

            <button
              onClick={() => {
                setActiveTab('tree');
                setTimeout(() => window.print(), 100);
              }}
              title="Print Family Tree Document"
              className="px-3.5 py-1.5 bg-[#FAF9F6] border border-[#E5E1DA] hover:bg-[#F5F2EF] text-[#2D2926] font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer hidden md:flex print:hidden"
            >
              <Printer className="w-3.5 h-3.5 shrink-0 text-[#7A7570]" />
              Print Tree
            </button>

            <button
              onClick={handleExportJSON}
              title="Export complete database as local .json file"
              className="px-3.5 py-1.5 bg-[#FAF9F6] border border-[#E5E1DA] hover:bg-[#F5F2EF] text-[#2D2926] font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 shrink-0 text-[#7A7570]" />
              Export Tree
            </button>

            <button
              onClick={handleRestoreDemo}
              title="Reset configuration to default Sterling Lineage database"
              className="px-3.5 py-1.5 bg-[#FAF9F6] border border-[#E5E1DA] hover:bg-[#F5F2EF] text-[#2D2926] font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#7A7570]" />
              Reset Demo
            </button>

            <button
              onClick={handleClearTree}
              title="Erase all records and start slate empty"
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>

            <button
              onClick={handleLogout}
              title="Close secure archive session"
              className="px-3.5 py-1.5 bg-[#FAF9F6] border border-[#E5E1DA] hover:bg-[#F5F2EF] text-[#2D2926] font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#7A7570]" />
              Secure
            </button>

          </div>
        </div>
      </header>

      {/* 2.25 COLLABORATIVE ACTIVE USER CONTROLS WARNING STATUS BANNER */}
      {session.role !== 'owner' && (
        <div className="bg-amber-50/90 border-b border-amber-200 text-amber-900 py-3 px-6 text-xs select-none">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2 text-left">
            <div className="flex items-center gap-2 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>
                Simulated Session: Contributing as <strong className="font-bold">{session.currentUser}</strong> ({session.role === 'editor' ? 'Co-Editor Sandbox' : 'Suggestions-Only Contributor Mode'}).
              </span>
              {session.allowedBranchId && (
                <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  Branch Constraint: {members.find(x => x.id === session.allowedBranchId)?.lastName} Line
                </span>
              )}
            </div>
            
            <button
              onClick={() => setSession({ currentUser: 'Owner (You)', role: 'owner' })}
              className="bg-[#2D2926] text-white hover:bg-[#1C1A18] px-2.5 py-1 rounded font-bold uppercase tracking-wider text-[9px] cursor-pointer"
            >
              Back to Owner Admin Mode
            </button>
          </div>
        </div>
      )}

      {/* 2. MINIMALIST PLATFORM METRICS SUMMARY */}
      <div className="bg-[#FAF9F6] border-b border-[#E5E1DA] py-3 text-[#7A7570] select-none text-xs font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap gap-x-8 gap-y-2 items-center justify-start md:justify-between">
          <div className="flex gap-x-6 gap-y-2 flex-wrap items-center">
            <span>
              Total Record Cards: <strong className="font-mono text-[#2D2926] text-sm font-bold">{members.length}</strong>
            </span>
            <span className="hidden md:inline text-[#E5E1DA]">|</span>
            <span>
              Earliest Birth: <strong className="font-mono text-[#2D2926] text-sm font-bold">
                {members.length > 0 ? Math.min(...members.map(m => m.birthDate ? parseInt(m.birthDate.slice(0, 4)) || 2026 : 2026)) : 'N/A'}
              </strong>
            </span>
            <span className="hidden md:inline text-[#E5E1DA]">|</span>
            <span>
              Deceased: <strong className="font-mono text-[#2D2926] text-sm font-bold">
                {members.filter((m) => m.isDeceased).length}
              </strong>
            </span>
          </div>

          <div className="text-[10px] uppercase tracking-widest text-[#A8A29E] font-mono hidden lg:block">
            📍 Offline Sandbox &bull; Local Storage Persistence Active
          </div>
        </div>
      </div>

      {/* 3. CORE ADAPTIVE WORKSPACE GRID */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grow flex flex-col gap-6 w-full">
        
        {/* Workspace Mode controllers tab-bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none border-b border-[#E5E1DA] pb-0 print:hidden">
          
          {/* Main Visual Tabs */}
          <div className="flex items-center gap-8 text-sm font-medium">
            <button
              onClick={() => {
                setActiveTab('tree');
                setShowForm(false);
              }}
              className={`pb-3.5 text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === 'tree' && !showForm
                  ? 'text-[#2D2926] border-[#2D2926]'
                  : 'text-[#7A7570] border-transparent hover:text-[#2D2926]'
              }`}
            >
              <Network className="w-4 h-4 shrink-0" />
              Family Tree View
            </button>

            <button
              onClick={() => {
                setActiveTab('index');
                setShowForm(false);
              }}
              className={`pb-3.5 text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === 'index' && !showForm
                  ? 'text-[#2D2926] border-[#2D2926]'
                  : 'text-[#7A7570] border-transparent hover:text-[#2D2926]'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              Family Index
            </button>

            <button
              onClick={() => {
                setActiveTab('timeline');
                setShowForm(false);
              }}
              className={`pb-3.5 text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === 'timeline' && !showForm
                  ? 'text-[#2D2926] border-[#2D2926]'
                  : 'text-[#7A7570] border-transparent hover:text-[#2D2926]'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              Chronicle Timeline
            </button>

            <button
              onClick={() => {
                setActiveTab('collaboration');
                setShowForm(false);
              }}
              className={`pb-3.5 text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === 'collaboration' && !showForm
                  ? 'text-[#2D2926] border-[#2D2926]'
                  : 'text-[#7A7570] border-transparent hover:text-[#2D2926]'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              Collaboration Hub
              {suggestions.filter(s => s.status === 'pending').length > 0 && session.role === 'owner' && (
                <span className="bg-amber-500 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded-full animate-bounce">
                  {suggestions.filter(s => s.status === 'pending').length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('analytics');
                setShowForm(false);
              }}
              className={`pb-3.5 text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === 'analytics' && !showForm
                  ? 'text-[#2D2926] border-[#2D2926]'
                  : 'text-[#7A7570] border-transparent hover:text-[#2D2926]'
              }`}
            >
              <PieChart className="w-4 h-4 shrink-0" />
              Lineage Analytics
            </button>

            <button
              onClick={() => {
                setActiveTab('map');
                setShowForm(false);
              }}
              className={`pb-3.5 text-xs font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer border-b-2 ${
                activeTab === 'map' && !showForm
                  ? 'text-[#2D2926] border-[#2D2926]'
                  : 'text-[#7A7570] border-transparent hover:text-[#2D2926]'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" />
              Geographic Atlas
            </button>
          </div>
          {/* "+ Add New Member" Quick Global Button */}
          <div className="self-end sm:self-center shrink-0">
            <button
              onClick={handleCreateNewMemberRequest}
              className="px-4 py-2 bg-[#2D2926] hover:bg-stone-800 transition-colors rounded-lg text-white text-xs font-semibold flex items-center gap-2 pointer-events-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register Member
            </button>
          </div>

        </div>

        {/* WORKSPACE DUAL GRID SPLIT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block">
          
          {/* LEFT AREA: Tab Views OR Create Member forms */}
          <div className="xl:col-span-8 space-y-6 print:w-full print:block">
            
            {showForm ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <MemberForm
                  members={members}
                  editMemberId={editMemberId}
                  prefillRelation={prefillRelation}
                  onSave={handleSaveMember}
                  onCancel={() => {
                    setShowForm(false);
                    setEditMemberId(null);
                    setPrefillRelation(null);
                  }}
                />
              </motion.div>
            ) : (
              <div>
                {activeTab === 'tree' && (
                  <TreeCanvas
                    members={members}
                    focusId={focusId}
                    onSelectFocus={handleSelectMemberFocus}
                    onAddRelativeRequest={handleAddRelativeRequest}
                  />
                )}

                {activeTab === 'index' && (
                  <MemberIndex
                    members={members}
                    onSelectMember={handleSelectMemberFocus}
                    onEditMember={handleEditMemberRequest}
                    onDeleteMember={handleDeleteMember}
                    onViewTree={handleSelectAndTab}
                  />
                )}

                {activeTab === 'timeline' && (
                  <LineageTimeline
                    members={members}
                    onSelectMember={handleSelectMemberFocus}
                    onViewTree={handleSelectAndTab}
                  />
                )}

                {activeTab === 'collaboration' && (
                  <CollaborationHub
                    members={members}
                    suggestions={suggestions}
                    session={session}
                    onChangeSession={setSession}
                    onApproveSuggestion={handleApproveSuggestion}
                    onRejectSuggestion={handleRejectSuggestion}
                    onClearSuggestions={handleClearSuggestions}
                  />
                )}

                {activeTab === 'analytics' && (
                  <LineageStats members={members} />
                )}

                {activeTab === 'map' && (
                  <LineageMap 
                    members={members} 
                    onSelectMember={handleSelectMemberFocus} 
                  />
                )}
              </div>
            )}

          </div>

          {/* RIGHT AREA: Persistent active focus profile cards details */}
          <div className="xl:col-span-4 select-none sticky top-24 space-y-4 print:hidden">
            {activeFocusMember ? (
              <div className="bg-white border border-[#E5E1DA] rounded-xl text-left overflow-hidden flex flex-col justify-start">
                
                {/* Profile Card Body */}
                <div className="p-6 space-y-6">
                  
                  {/* Title & Avatar */}
                  <div className="flex items-center gap-4">
                    {(() => {
                      const profileImage = activeFocusMember.media?.find(m => m.type === 'image');
                      if (profileImage) {
                        return (
                          <img 
                            src={profileImage.url} 
                            alt={activeFocusMember.firstName} 
                            className="w-12 h-12 rounded-full border border-[#E5E1DA] object-cover shrink-0 select-none shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        );
                      }
                      return (
                        <span 
                          className="w-12 h-12 rounded-full border border-[#E5E1DA] flex items-center justify-center font-serif font-bold text-white text-lg shrink-0 select-none pb-0.5 shadow-sm"
                          style={{ backgroundColor: activeFocusMember.avatarUrl || '#2D2926' }}
                        >
                          {activeFocusMember.firstName[0]}
                        </span>
                      );
                    })()}
                    
                    <div className="space-y-0.5 truncate text-left">
                      <h3 className="font-serif font-bold text-xl text-[#2D2926] leading-tight truncate">
                        {activeFocusMember.firstName} {activeFocusMember.lastName}
                        {activeFocusMember.maidenName && (
                          <span className="text-xs text-[#7A7570] block italic font-sans font-normal truncate">
                            née {activeFocusMember.maidenName}
                          </span>
                        )}
                      </h3>
                      <p className="font-mono text-xs text-[#7A7570] font-semibold mt-0.5">
                        {activeFocusMember.birthDate ? activeFocusMember.birthDate.slice(0, 4) : '????'}
                        {' – '}
                        {activeFocusMember.isDeceased 
                          ? (activeFocusMember.deathDate ? activeFocusMember.deathDate.slice(0, 4) : 'Deceased') 
                          : 'Present'}
                      </p>
                      
                      <span className="text-[10px] text-[#A8A29E] font-mono mt-0.5 block">
                        {getEraLabel(activeFocusMember.birthDate).era}
                      </span>
                    </div>
                  </div>

                  {/* Biography text */}
                  {activeFocusMember.biography ? (
                    <div className="space-y-1.5 p-4 rounded-lg bg-[#FAF9F6] border border-[#E5E1DA]">
                      <h4 className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest flex items-center gap-1 leading-none">
                        <BookOpen className="w-3.5 h-3.5 text-[#A8A29E]" /> Life Story Outline
                      </h4>
                      <p className="text-xs font-normal text-[#7A7570] leading-relaxed text-left text-wrap whitespace-normal overflow-hidden break-words max-h-[190px] overflow-y-auto pt-1">
                        {activeFocusMember.biography}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-[#FAF9F6] border border-dashed border-[#E5E1DA] text-center text-xs text-[#7A7570] italic">
                      No biography notes recorded. Feel free to click Edit below to populate this ancestor's biography!
                    </div>
                  )}

                  {/* Biographical Stats block */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider block">Birth Details</span>
                      <p className="font-medium text-[#2D2926] truncate" title={activeFocusMember.birthPlace}>
                        <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#A8A29E] align-middle" />
                        <span className="align-middle">{activeFocusMember.birthPlace || 'Location Unknown'}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider block">Life Calling</span>
                      <p className="font-medium text-[#2D2926] truncate" title={activeFocusMember.occupation}>
                        <Briefcase className="w-3.5 h-3.5 inline mr-1 text-[#A8A29E] align-middle" />
                        <span className="align-middle">{activeFocusMember.occupation || 'Unspecified'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Immediate Direct Relatives Tree Navigation Links */}
                  <div className="border-t border-[#E5E1DA] pt-4 space-y-3">
                    <h4 className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">Immediate Kinship Direct Directory</h4>
                    
                    <div className="space-y-1.5 text-left text-xs text-[#2D2926] max-h-[200px] overflow-y-auto pr-1">
                      
                      {/* Father */}
                      <div className="flex items-center justify-between py-1 border-b border-[#FAF9F6]">
                        <span className="text-[11px] font-mono text-[#7A7570]">Father</span>
                        {activeFather ? (
                          <button
                            onClick={() => handleSelectMemberFocus(activeFather.id)}
                            className="font-medium text-[#2D2926] hover:underline truncate text-right cursor-pointer"
                          >
                            {activeFather.firstName} {activeFather.lastName}
                          </button>
                        ) : (
                          <span className="text-[#A8A29E] italic text-[11px]">Unlinked</span>
                        )}
                      </div>

                      {/* Mother */}
                      <div className="flex items-center justify-between py-1 border-b border-[#FAF9F6]">
                        <span className="text-[11px] font-mono text-[#7A7570]">Mother</span>
                        {activeMother ? (
                          <button
                            onClick={() => handleSelectMemberFocus(activeMother.id)}
                            className="font-[#2D2926] hover:underline truncate text-right cursor-pointer"
                          >
                            {activeMother.firstName} {activeMother.lastName}
                          </button>
                        ) : (
                          <span className="text-[#A8A29E] italic text-[11px]">Unlinked</span>
                        )}
                      </div>

                      {/* Spouse(s) */}
                      <div className="flex items-start justify-between py-1 border-b border-[#FAF9F6] gap-2">
                        <span className="text-[11px] font-mono text-[#7A7570] pt-0.5 shrink-0">Spouse</span>
                        <div className="flex flex-col items-end text-right">
                          {activeSpouses.length > 0 ? (
                            activeSpouses.map((sp) => (
                              <button
                                key={sp.id}
                                onClick={() => handleSelectMemberFocus(sp.id)}
                                className="font-medium text-[#2D2926] hover:underline truncate cursor-pointer"
                              >
                                {sp.firstName} {sp.lastName}
                              </button>
                            ))
                          ) : (
                            <span className="text-[#A8A29E] italic text-[11px]">Unlinked</span>
                          )}
                        </div>
                      </div>

                      {/* Children list */}
                      <div className="flex items-start justify-between py-1 border-b border-[#FAF9F6] gap-2">
                        <span className="text-[11px] font-mono text-[#7A7570] pt-0.5 shrink-0">Children ({activeChildren.length})</span>
                        <div className="flex flex-col items-end text-right max-w-[200px] gap-0.5">
                          {activeChildren.length > 0 ? (
                            activeChildren.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => handleSelectMemberFocus(c.id)}
                                className="font-medium text-[#2D2926] hover:underline truncate cursor-pointer"
                              >
                                {c.firstName} {c.lastName}
                              </button>
                            ))
                          ) : (
                            <span className="text-[#A8A29E] italic text-[11px]">None</span>
                          )}
                        </div>
                      </div>

                      {/* Siblings list */}
                      <div className="flex items-start justify-between py-1 gap-2">
                        <span className="text-[11px] font-mono text-[#7A7570] pt-0.5 shrink-0">Siblings ({activeSiblings.length})</span>
                        <div className="flex flex-col items-end text-right max-w-[200px] gap-0.5">
                          {activeSiblings.length > 0 ? (
                            activeSiblings.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => handleSelectMemberFocus(s.id)}
                                className="font-medium text-[#2D2926] hover:underline truncate cursor-pointer"
                              >
                                {s.firstName} {s.lastName}
                              </button>
                            ))
                          ) : (
                            <span className="text-[#A8A29E] italic text-[11px]">None</span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 3.5 Media Archives Vault Accordion Drawer */}
                  <div className="border-t border-[#E5E1DA] pt-4 text-left">
                    {/* Branch boundary banner if restricted */}
                    {!isMemberInAllowedBranch(activeFocusMember.id) ? (
                      <div className="bg-stone-50 border border-[#E5E1DA] rounded-lg p-3 text-stone-500 text-[10px] leading-relaxed flex items-start gap-2">
                        <Lock className="w-3.5 h-3.5 text-[#A8A29E] shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold text-[#2D2926] uppercase block mb-0.5">Encrypted Credentials Area</strong>
                          This profile resides outside your assigned collaboration branch rules. Contributions of historical uploads are locked.
                        </div>
                      </div>
                    ) : (
                      <MediaGallery
                        member={activeFocusMember}
                        onUpdateMedia={(updatedList) => {
                          handleUpdateMemberMedia(activeFocusMember.id, updatedList);
                        }}
                        readOnly={session.role === 'guest_contributor'} // Contributor mode manages media proposals in main edit/add suggestions forms rather than auto-save
                      />
                    )}
                  </div>

                  {/* Profile control tools */}
                  <div className="border-t border-[#E5E1DA] pt-4 flex gap-2">
                    <button
                      onClick={() => handleSelectAndTab(activeFocusMember.id)}
                      className="flex-1 py-2 text-center border border-[#E5E1DA] hover:bg-[#FAF9F6] text-[#2D2926] font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-white"
                    >
                      <Network className="w-3.5 h-3.5" /> Center Tree
                    </button>
                    <button
                      onClick={() => handleEditMemberRequest(activeFocusMember.id)}
                      className="flex-1 py-2 text-center bg-[#2D2926] hover:bg-stone-850 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      Edit Bio
                    </button>
                  </div>

                </div>
              </div>
            ) : (
              <div className="border border-dashed border-[#E5E1DA] rounded-xl bg-[#FAF9F6] p-6 text-center text-[#7A7570] text-xs italic">
                Create family members to display details here.
              </div>
            )}

            <RecentlyVisited
              memberIds={recentlyVisited}
              members={members}
              focusId={focusId}
              onSelectMember={handleSelectMemberFocus}
            />
          </div>

        </div>

      </main>

      {/* 4. FOOTER CREDITS */}
      <footer className="bg-[#FAF9F6] text-[#7A7570] text-xs font-medium py-8 border-t border-[#E5E1DA] mt-20 select-none text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 Family Lineage Archive Builder. Built for deep pedigree charting.</p>
          <p className="flex items-center gap-1 text-[11px] font-mono">
            <span>Designed for historical preservation & genealogy recording</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
