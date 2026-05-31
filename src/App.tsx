/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FamilyMember, MediaAttachment, HeritageSide } from './types';
import { TreeCanvas } from './components/TreeCanvas';
import { MemberIndex } from './components/MemberIndex';
import { LineageTimeline } from './components/LineageTimeline';
import { MemberForm } from './components/MemberForm';
import { SimpleMemberForm } from './components/SimpleMemberForm';
import { MediaGallery } from './components/MediaGallery';
import { RecentlyVisited } from './components/RecentlyVisited';
import { LineageStats } from './components/LineageStats';
import { LineageMap } from './components/LineageMap';
import { AuthScreen } from './components/AuthScreen';
import { OnboardingWizard } from './components/OnboardingWizard';
import { CollaborationHub } from './components/CollaborationHub';
import { ProfileSetup } from './components/ProfileSetup';
import { useAuth } from './hooks/useAuth';
import { useLineageStore } from './hooks/useLineageStore';
import { useCollaborationStore } from './hooks/useCollaborationStore';
import { useAppDialog } from './hooks/useAppDialog';
import { removeMemberCleanly, findSiblings, getEraLabel } from './utils';
import { shareBranchWithFamily } from './lib/shareBranch';
import { normalizeFamilyMembers, parseFamilyJsonExport } from './lib/importFamilyJson';
import { loadUserProfile, profileNeedsNames } from './lib/profileDb';
import type { UserProfile } from './types';
import {
  Network,
  Users,
  History,
  FileDown,
  FileUp,
  Trash2,
  Plus,
  MapPin,
  Briefcase,
  BookOpen,
  Lock,
  PieChart,
  Globe,
  Printer,
  Loader2,
  Cloud,
  CloudOff,
  Share2,
  Type,
  GitBranch,
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast, confirm } = useAppDialog();
  const {
    treeId,
    members,
    setMembers,
    focusId,
    setFocusId,
    recentlyVisited,
    updateRecentlyVisited,
    blueprintLayout,
    updateBlueprintLayout,
    geocodeCache,
    updateGeocodeCache,
    anchorMemberId,
    updateAnchorMemberId,
    heritageMode,
    updateHeritageMode,
    seniorMode,
    updateSeniorMode,
    saveStatus,
    loadError,
    clearTree,
    retryLoad,
  } = useLineageStore(user?.id);

  const collaboration = useCollaborationStore(
    user?.id,
    treeId ?? undefined,
    members,
    anchorMemberId
  );

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setUserProfile(null);
      return;
    }
    setProfileLoading(true);
    loadUserProfile(user.id)
      .then(setUserProfile)
      .catch(() => setUserProfile(null))
      .finally(() => setProfileLoading(false));
  }, [user?.id]);

  const [activeTab, setActiveTab] = useState<
    'tree' | 'index' | 'timeline' | 'analytics' | 'map' | 'collaboration'
  >('tree');
  const [showForm, setShowForm] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [prefillRelation, setPrefillRelation] = useState<{
    memberId: string;
    type: 'father' | 'mother' | 'spouse' | 'child' | 'sibling';
  } | null>(null);
  const [prefillHeritage, setPrefillHeritage] = useState<{
    side: HeritageSide;
    label?: string;
  } | null>(null);
  const [markAsAnchor, setMarkAsAnchor] = useState(false);
  const [useSimpleForm, setUseSimpleForm] = useState(true);

  const onboardingKey = user ? `kin_onboarding_dismissed_${user.id}` : '';
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setOnboardingDismissed(
        localStorage.getItem(`kin_onboarding_dismissed_${user.id}`) === 'true'
      );
    }
  }, [user?.id]);

  const dismissOnboarding = () => {
    if (onboardingKey) localStorage.setItem(onboardingKey, 'true');
    setOnboardingDismissed(true);
  };

  const heritageOnboardingIncomplete = useMemo(() => {
    if (!heritageMode || !anchorMemberId) return false;
    const anchor = members.find((m) => m.id === anchorMemberId);
    return Boolean(anchor && (!anchor.motherId || !anchor.fatherId));
  }, [heritageMode, anchorMemberId, members]);

  const showOnboarding =
    !onboardingDismissed &&
    activeTab === 'tree' &&
    !showForm &&
    (members.length === 0 || heritageOnboardingIncomplete);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focusId) return;
    const filtered = recentlyVisited.filter((id) => id !== focusId);
    const updated = [focusId, ...filtered].slice(0, 5);
    if (JSON.stringify(updated) !== JSON.stringify(recentlyVisited)) {
      updateRecentlyVisited(updated);
    }
  }, [focusId, recentlyVisited, updateRecentlyVisited]);

  const activeFocusMember = useMemo(() => {
    return members.find((m) => m.id === focusId) || members[0] || null;
  }, [members, focusId]);

  useEffect(() => {
    if (members.length > 0 && !members.find((m) => m.id === focusId)) {
      setFocusId(members[0].id);
    }
  }, [members, focusId, setFocusId]);

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

    for (const [, m] of map.entries()) {
      if (m.fatherId) {
        const father = map.get(m.fatherId);
        if (father && !father.childrenIds.includes(m.id)) {
          father.childrenIds.push(m.id);
        }
      }
      if (m.motherId) {
        const mother = map.get(m.motherId);
        if (mother && !mother.childrenIds.includes(m.id)) {
          mother.childrenIds.push(m.id);
        }
      }
      for (const childId of m.childrenIds) {
        const child = map.get(childId);
        if (child) {
          if (m.gender === 'male' && child.fatherId !== m.id) child.fatherId = m.id;
          else if (m.gender === 'female' && child.motherId !== m.id) child.motherId = m.id;
        }
      }
      for (const spouseId of m.spouseIds) {
        const spouse = map.get(spouseId);
        if (spouse && !spouse.spouseIds.includes(m.id)) spouse.spouseIds.push(m.id);
      }
    }

    return Array.from(map.values());
  };

  const handleUpdateMemberMedia = (memberId: string, updatedMediaList: MediaAttachment[]) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, media: updatedMediaList } : m))
    );
  };

  const handleSaveMember = (savedMember: FamilyMember) => {
    let member = { ...savedMember };
    if (markAsAnchor) {
      member = { ...member, isAnchor: true, heritageSide: 'neutral' };
      updateAnchorMemberId(member.id);
    }
    if (prefillHeritage && !member.heritageSide) {
      member = {
        ...member,
        heritageSide: prefillHeritage.side,
        heritageLabel: prefillHeritage.label || member.heritageLabel,
      };
    }

    setMembers((prev) => {
      const nextList = prev.map((m) =>
        markAsAnchor && m.isAnchor ? { ...m, isAnchor: false } : m
      );
      const index = nextList.findIndex((m) => m.id === member.id);
      if (index >= 0) nextList[index] = member;
      else nextList.push(member);
      return synchronizeAllRelationships(nextList);
    });
    setFocusId(member.id);
    setShowForm(false);
    setEditMemberId(null);
    setPrefillRelation(null);
    setPrefillHeritage(null);
    setMarkAsAnchor(false);
    if (members.length === 0 || (heritageMode && member.isAnchor)) {
      // keep onboarding visible until dual heritage steps complete
    } else if (!heritageOnboardingIncomplete) {
      dismissOnboarding();
    }
  };

  const handleDeleteMember = (targetId: string) => {
    setMembers((prev) => removeMemberCleanly(prev, targetId));
    setShowForm(false);
  };

  const handleCreateNewMemberRequest = (options?: { asAnchor?: boolean }) => {
    setEditMemberId(null);
    setPrefillRelation(null);
    setPrefillHeritage(null);
    setMarkAsAnchor(options?.asAnchor ?? false);
    setUseSimpleForm(seniorMode);
    setShowForm(true);
  };

  const handleEditMemberRequest = (id: string) => {
    setEditMemberId(id);
    setPrefillRelation(null);
    setPrefillHeritage(null);
    setMarkAsAnchor(false);
    setUseSimpleForm(false);
    setShowForm(true);
  };

  const handleAddRelativeRequest = (
    memberId: string,
    type: 'father' | 'mother' | 'spouse' | 'child' | 'sibling',
    heritage?: { side: HeritageSide; label?: string }
  ) => {
    if (type === 'sibling') {
      const pivot = members.find((m) => m.id === memberId);
      if (!pivot?.fatherId && !pivot?.motherId) {
        toast('Add a mother or father first, then you can add siblings.', 'info');
        return;
      }
    }
    setEditMemberId(null);
    setPrefillRelation({ memberId, type });
    setPrefillHeritage(heritage ?? null);
    setMarkAsAnchor(false);
    setUseSimpleForm(seniorMode && type !== 'sibling');
    setShowForm(true);
  };

  const handleShareBranch = async () => {
    if (members.length === 0) {
      toast('Add at least one person before sharing.', 'info');
      return;
    }
    try {
      const result = await shareBranchWithFamily(members, user?.email);
      if (result === 'shared') toast('Your family branch was shared.', 'success');
      else if (result === 'downloaded') toast('File downloaded — attach it to your email.', 'success');
    } catch {
      toast('Could not share. Try Export Tree instead.', 'error');
    }
  };

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
      toast('Failed to export family tree.', 'error');
    }
  };

  const handleImportMembers = (parsed: FamilyMember[]) => {
    try {
      const normalized = normalizeFamilyMembers(parsed);
      if (normalized.length === 0 || !normalized[0]?.id) {
        toast('Invalid file format. Ensure it is a valid list of family member records.', 'error');
        return;
      }
      setMembers(synchronizeAllRelationships(normalized));
      setFocusId(normalized[0].id);
      toast(`Successfully imported ${normalized.length} family records.`, 'success');
      dismissOnboarding();
    } catch (err) {
      console.error('Import failed:', err);
      toast(err instanceof Error ? err.message : 'Import failed.', 'error');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseFamilyJsonExport(event.target?.result as string);
        handleImportMembers(parsed);
      } catch (err) {
        console.error('Import process crash:', err);
        toast(err instanceof Error ? err.message : 'Could not parse JSON structure.', 'error');
      }
    };
    reader.onerror = () => toast('Could not read file.', 'error');
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearTree = async () => {
    const ok = await confirm(
      'Are you absolutely sure you want to completely clear this lineage chart? Your data will be permanently removed from the cloud.'
    );
    if (ok) {
      await clearTree();
      setShowForm(false);
    }
  };

  const handleSelectMemberFocus = (id: string) => setFocusId(id);

  const handleSelectAndTab = (id: string) => {
    setFocusId(id);
    setActiveTab('tree');
  };

  const handleLogout = async () => {
    await signOut();
  };

  const activeFather = activeFocusMember?.fatherId
    ? members.find((m) => m.id === activeFocusMember.fatherId)
    : null;
  const activeMother = activeFocusMember?.motherId
    ? members.find((m) => m.id === activeFocusMember.motherId)
    : null;
  const activeSpouses = activeFocusMember
    ? members.filter((m) => (activeFocusMember.spouseIds ?? []).includes(m.id))
    : [];
  const activeChildren = activeFocusMember
    ? members.filter((m) => (activeFocusMember.childrenIds ?? []).includes(m.id))
    : [];
  const activeSiblings = activeFocusMember ? findSiblings(members, activeFocusMember) : [];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#7A7570]" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (saveStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#7A7570]" />
        <p className="text-xs text-[#7A7570]">Loading your family archive...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-2xl border border-rose-200 max-w-sm text-center space-y-4">
          <CloudOff className="w-8 h-8 text-rose-500 mx-auto" />
          <p className="text-sm text-[#2D2926] font-semibold">Failed to load your archive</p>
          <p className="text-xs text-[#7A7570]">{loadError}</p>
          <button
            onClick={retryLoad}
            className="px-4 py-2 bg-[#2D2926] text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#7A7570]" />
      </div>
    );
  }

  if (user && !profileLoading && (!userProfile || profileNeedsNames(userProfile))) {
    return (
      <ProfileSetup
        userId={user.id}
        onComplete={(profile) => {
          setUserProfile(profile);
          collaboration.refresh();
        }}
      />
    );
  }

  const saveIndicator = () => {
    if (saveStatus === 'saving') return 'Saving...';
    if (saveStatus === 'saved') return 'Saved to cloud';
    if (saveStatus === 'error') return 'Save failed';
    return '';
  };

  const allTabs = [
    ['tree', Network, 'Family tree'],
    ['index', Users, 'People list'],
    ['timeline', History, 'Family timeline'],
    ['collaboration', GitBranch, 'Collaboration'],
    ['analytics', PieChart, 'Statistics'],
    ['map', Globe, 'Family map'],
  ] as const;

  const visibleTabs = seniorMode
    ? allTabs.filter(([tab]) => tab === 'tree' || tab === 'index' || tab === 'timeline' || tab === 'collaboration')
    : allTabs;

  const isCollaborationTab = activeTab === 'collaboration';

  return (
    <div
      className="min-h-screen bg-[#FDFCFB] text-[#2D2926] flex flex-col font-sans"
      data-senior-mode={seniorMode ? 'true' : 'false'}
    >
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="bg-white/80 backdrop-blur-md text-[#2D2926] border-b border-[#E5E1DA] sticky top-0 z-40 animate-fadeIn print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-[#2D2926] flex items-center justify-center shrink-0">
              <Network className="w-4 h-4 text-white font-bold" />
            </span>
            <div className="text-left">
              <h1 className="text-lg font-semibold tracking-tight text-[#2D2926] leading-tight">
                Kith & Kin
              </h1>
              <p className="text-[10px] text-[#7A7570] font-medium font-mono uppercase tracking-wider">
                {seniorMode ? 'Your family tree' : 'Family archive'}
              </p>
              {user.email && (
                <p className="text-[10px] text-[#A8A29E] truncate max-w-[180px]" title={user.email}>
                  {user.email}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => updateSeniorMode(!seniorMode)}
              title="Larger text and buttons for easier reading"
              aria-pressed={seniorMode}
              className={`px-3.5 py-2 border font-semibold rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px] ${
                seniorMode
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-[#FAF9F6] border-[#E5E1DA] text-[#2D2926] hover:bg-[#F5F2EF]'
              }`}
            >
              <Type className="w-4 h-4 shrink-0" />
              Easier to read
            </button>

            <button
              onClick={() => handleCreateNewMemberRequest()}
              className="px-3.5 py-2 bg-[#2D2926] hover:bg-stone-800 text-white font-semibold rounded-lg text-sm flex items-center gap-1.5 cursor-pointer min-h-[44px] md:hidden"
            >
              <Plus className="w-4 h-4" />
              Add person
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJSON}
              accept=".json"
              className="hidden"
              aria-hidden="true"
            />

            {seniorMode ? (
              <button
                onClick={handleShareBranch}
                title="Send your family branch to a relative"
                className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg text-sm flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Share2 className="w-4 h-4 shrink-0" />
                Send to family
              </button>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Import saved family file"
                  aria-label="Import family file"
                  className="px-3.5 py-2 bg-[#FAF9F6] border border-[#E5E1DA] hover:bg-[#F5F2EF] text-[#2D2926] font-semibold rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                >
                  <FileUp className="w-4 h-4 shrink-0 text-[#7A7570]" />
                  Import saved file
                </button>

                <button
                  onClick={() => {
                    setActiveTab('tree');
                    setTimeout(() => window.print(), 100);
                  }}
                  title="Print family tree"
                  className="px-3.5 py-2 bg-[#FAF9F6] border border-[#E5E1DA] hover:bg-[#F5F2EF] text-[#2D2926] font-semibold rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer hidden md:flex print:hidden min-h-[44px]"
                >
                  <Printer className="w-4 h-4 shrink-0 text-[#7A7570]" />
                  Print
                </button>

                <button
                  onClick={handleExportJSON}
                  title="Export family tree file"
                  className="px-3.5 py-2 bg-[#FAF9F6] border border-[#E5E1DA] hover:bg-[#F5F2EF] text-[#2D2926] font-semibold rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                >
                  <FileDown className="w-4 h-4 shrink-0 text-[#7A7570]" />
                  Export
                </button>

                <button
                  onClick={handleClearTree}
                  title="Erase all records"
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/60 font-semibold rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              title="Sign out"
              className="px-3.5 py-2 bg-[#FAF9F6] border border-[#E5E1DA] hover:bg-[#F5F2EF] text-[#2D2926] font-semibold rounded-lg text-sm flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            >
              <Lock className="w-4 h-4 text-[#7A7570]" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {!seniorMode && (
      <div className="bg-[#FAF9F6] border-b border-[#E5E1DA] py-3 text-[#7A7570] text-xs font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap gap-x-8 gap-y-2 items-center justify-start md:justify-between">
          <div className="flex gap-x-6 gap-y-2 flex-wrap items-center">
            <span>
              People in tree:{' '}
              <strong className="font-mono text-[#2D2926] text-sm font-bold">{members.length}</strong>
            </span>
            <span className="hidden md:inline text-[#E5E1DA]">|</span>
            <span>
              Earliest birth:{' '}
              <strong className="font-mono text-[#2D2926] text-sm font-bold">
                {members.length > 0
                  ? Math.min(
                      ...members.map((m) =>
                        m.birthDate ? parseInt(m.birthDate.slice(0, 4)) || 2026 : 2026
                      )
                    )
                  : 'N/A'}
              </strong>
            </span>
            <span className="hidden md:inline text-[#E5E1DA]">|</span>
            <span>
              Deceased:{' '}
              <strong className="font-mono text-[#2D2926] text-sm font-bold">
                {members.filter((m) => m.isDeceased).length}
              </strong>
            </span>
          </div>

          <div className="text-[10px] uppercase tracking-widest text-[#A8A29E] font-mono hidden lg:flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5" />
            {saveIndicator()}
          </div>
        </div>
      </div>
      )}

      {seniorMode && saveStatus !== 'idle' && (
        <div className="bg-[#FAF9F6] border-b border-[#E5E1DA] py-2 text-center text-base text-[#5C5652]">
          <Cloud className="w-4 h-4 inline mr-1.5 align-middle" aria-hidden="true" />
          {saveIndicator()}
        </div>
      )}

      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grow flex flex-col gap-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E1DA] pb-0 print:hidden">
          <div className="flex items-center gap-4 sm:gap-8 text-sm font-medium flex-wrap" role="tablist" aria-label="Main sections">
            {visibleTabs.map(([tab, Icon, label]) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab && !showForm}
                onClick={() => {
                  setActiveTab(tab);
                  setShowForm(false);
                }}
                className={`pb-3.5 text-sm font-bold transition-all duration-150 flex items-center gap-2 cursor-pointer border-b-2 min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2 ${
                  activeTab === tab && !showForm
                    ? 'text-[#2D2926] border-[#2D2926]'
                    : 'text-[#7A7570] border-transparent hover:text-[#2D2926]'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div className="self-end sm:self-center shrink-0 hidden md:block">
            {!isCollaborationTab && (
            <button
              onClick={() => handleCreateNewMemberRequest()}
              className="px-5 py-2.5 bg-[#2D2926] hover:bg-stone-800 transition-colors rounded-lg text-white text-base font-semibold flex items-center gap-2 cursor-pointer min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#2D2926] focus-visible:ring-offset-2"
            >
              <Plus className="w-5 h-5" />
              Add person
            </button>
            )}
          </div>
        </div>

        {isCollaborationTab ? (
          <CollaborationHub
            ownTreeId={treeId ?? ''}
            ownUserId={user.id}
            ownMembers={members}
            anchorMemberId={anchorMemberId}
            heritageMode={heritageMode}
            accessibleTrees={collaboration.accessibleTrees}
            familyDirectory={collaboration.familyDirectory}
            incomingCollabRequests={collaboration.incomingCollabRequests}
            memberLinks={collaboration.memberLinks}
            suggestions={collaboration.suggestions}
            mergedMembers={collaboration.mergedMembers}
            virtualMembers={collaboration.virtualMembers}
            virtualById={collaboration.virtualById}
            conflicts={collaboration.conflicts}
            linkCandidates={collaboration.linkCandidates}
            loading={collaboration.loading}
            error={collaboration.error}
            schemaMissing={collaboration.schemaMissing}
            hubFocusId={collaboration.hubFocusId}
            onFocusChange={collaboration.setHubFocusId}
            onAskToCollab={collaboration.askToCollab}
            onAcceptCollab={collaboration.acceptCollab}
            onDeclineCollab={collaboration.declineCollab}
            onCancelCollab={collaboration.cancelCollab}
            onDisconnect={collaboration.disconnectFromUser}
            onLinkMembers={collaboration.linkMembers}
            onAcceptLink={collaboration.acceptLink}
            onRejectLink={collaboration.rejectLink}
            onApproveSuggestion={async (sug) => {
              await collaboration.approveSuggestion(sug);
              retryLoad();
              toast('Suggestion approved and applied to the tree.', 'success');
            }}
            onRejectSuggestion={collaboration.rejectSuggestion}
            onRefresh={collaboration.refresh}
            onSubmitSuggestion={collaboration.submitSuggestion}
            onImportJson={(members, label) => {
              try {
                const tree = collaboration.importJsonTree(members, label);
                toast(
                  `Imported "${tree.name}" with ${tree.members.length} people. Link the shared person below.`,
                  'success'
                );
              } catch (err) {
                console.error('Hub JSON import failed:', err);
                toast(err instanceof Error ? err.message : 'Import failed.', 'error');
              }
            }}
            onRemoveImportedTree={collaboration.removeImportedTree}
            userDisplayName={
              userProfile
                ? `${userProfile.firstName} ${userProfile.lastName}`.trim()
                : 'Contributor'
            }
          />
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start print:block">
          <div className="xl:col-span-8 space-y-6 print:w-full print:block">
            {showForm ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {useSimpleForm && !editMemberId ? (
                  <SimpleMemberForm
                    members={members}
                    prefillRelation={prefillRelation}
                    onSave={handleSaveMember}
                    onCancel={() => {
                      setShowForm(false);
                      setEditMemberId(null);
                      setPrefillRelation(null);
                      setPrefillHeritage(null);
                      setMarkAsAnchor(false);
                    }}
                    onShowAllDetails={() => setUseSimpleForm(false)}
                  />
                ) : (
                  <MemberForm
                    members={members}
                    editMemberId={editMemberId}
                    prefillRelation={prefillRelation}
                    prefillHeritage={prefillHeritage}
                    showHeritageFields={heritageMode}
                    onSave={handleSaveMember}
                    onCancel={() => {
                      setShowForm(false);
                      setEditMemberId(null);
                      setPrefillRelation(null);
                      setPrefillHeritage(null);
                      setMarkAsAnchor(false);
                    }}
                  />
                )}
              </motion.div>
            ) : showOnboarding ? (
              <OnboardingWizard
                members={members}
                anchorMemberId={anchorMemberId}
                heritageMode={heritageMode}
                onStartDualHeritage={() => updateHeritageMode(true)}
                onStartSingleTree={() => updateHeritageMode(false)}
                onStartGrandparentSide={() => updateSeniorMode(true)}
                onAddYourself={(options) => {
                  handleCreateNewMemberRequest(options);
                }}
                onAddMaternalSide={(label) => {
                  if (!anchorMemberId) return;
                  handleAddRelativeRequest(anchorMemberId, 'mother', {
                    side: 'maternal',
                    label,
                  });
                }}
                onAddPaternalSide={(label) => {
                  if (!anchorMemberId) return;
                  handleAddRelativeRequest(anchorMemberId, 'father', {
                    side: 'paternal',
                    label,
                  });
                }}
                onAddParent={() => {
                  if (members.length === 0) {
                    toast('Add yourself first, then you can link parents.', 'info');
                    handleCreateNewMemberRequest();
                    return;
                  }
                  const pivot = anchorMemberId ?? members[0].id;
                  handleAddRelativeRequest(pivot, 'father');
                }}
                onImport={() => {
                  dismissOnboarding();
                  fileInputRef.current?.click();
                }}
                onDismiss={dismissOnboarding}
              />
            ) : (
              <div>
                {activeTab === 'tree' && (
                  <TreeCanvas
                    members={members}
                    focusId={focusId}
                    anchorMemberId={anchorMemberId}
                    heritageMode={heritageMode}
                    layout={blueprintLayout}
                    onLayoutChange={updateBlueprintLayout}
                    onSelectFocus={handleSelectMemberFocus}
                    onAddRelativeRequest={handleAddRelativeRequest}
                    onRegisterFirst={handleCreateNewMemberRequest}
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
                    anchorMemberId={anchorMemberId}
                    heritageMode={heritageMode}
                  />
                )}
                {activeTab === 'analytics' && <LineageStats members={members} />}
                {activeTab === 'map' && (
                  <LineageMap
                    members={members}
                    geocodeCache={geocodeCache}
                    onGeocodeCacheUpdate={updateGeocodeCache}
                    onSelectMember={handleSelectMemberFocus}
                    anchorMemberId={anchorMemberId}
                    heritageMode={heritageMode}
                  />
                )}
              </div>
            )}
          </div>

          <div className="xl:col-span-4 sticky top-24 space-y-4 print:hidden">
            {activeFocusMember ? (
              <div className="bg-white border border-[#E5E1DA] rounded-xl text-left overflow-hidden flex flex-col justify-start">
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const profileImage = activeFocusMember.media?.find((m) => m.type === 'image');
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
                          {(activeFocusMember.firstName?.[0] ?? '?').toUpperCase()}
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
                          ? activeFocusMember.deathDate
                            ? activeFocusMember.deathDate.slice(0, 4)
                            : 'Deceased'
                          : 'Present'}
                      </p>
                      <span className="text-[10px] text-[#A8A29E] font-mono mt-0.5 block">
                        {getEraLabel(activeFocusMember.birthDate).era}
                      </span>
                    </div>
                  </div>

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
                      No biography notes recorded. Click Edit below to add one.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider block">
                        Birth Details
                      </span>
                      <p className="font-medium text-[#2D2926] truncate" title={activeFocusMember.birthPlace}>
                        <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#A8A29E] align-middle" />
                        <span className="align-middle">
                          {activeFocusMember.birthPlace || 'Location Unknown'}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider block">
                        Life Calling
                      </span>
                      <p className="font-medium text-[#2D2926] truncate" title={activeFocusMember.occupation}>
                        <Briefcase className="w-3.5 h-3.5 inline mr-1 text-[#A8A29E] align-middle" />
                        <span className="align-middle">
                          {activeFocusMember.occupation || 'Unspecified'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#E5E1DA] pt-4 space-y-3">
                    <h4 className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">
                      Immediate Kinship Directory
                    </h4>
                    <div className="space-y-1.5 text-left text-xs text-[#2D2926] max-h-[200px] overflow-y-auto pr-1">
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
                      <div className="flex items-center justify-between py-1 border-b border-[#FAF9F6]">
                        <span className="text-[11px] font-mono text-[#7A7570]">Mother</span>
                        {activeMother ? (
                          <button
                            onClick={() => handleSelectMemberFocus(activeMother.id)}
                            className="font-medium text-[#2D2926] hover:underline truncate text-right cursor-pointer"
                          >
                            {activeMother.firstName} {activeMother.lastName}
                          </button>
                        ) : (
                          <span className="text-[#A8A29E] italic text-[11px]">Unlinked</span>
                        )}
                      </div>
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
                      <div className="flex items-start justify-between py-1 border-b border-[#FAF9F6] gap-2">
                        <span className="text-[11px] font-mono text-[#7A7570] pt-0.5 shrink-0">
                          Children ({activeChildren.length})
                        </span>
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
                      <div className="flex items-start justify-between py-1 gap-2">
                        <span className="text-[11px] font-mono text-[#7A7570] pt-0.5 shrink-0">
                          Siblings ({activeSiblings.length})
                        </span>
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

                  <div className="border-t border-[#E5E1DA] pt-4 text-left">
                    <MediaGallery
                      member={activeFocusMember}
                      onUpdateMedia={(updatedList) => {
                        handleUpdateMemberMedia(activeFocusMember.id, updatedList);
                      }}
                      userId={user.id}
                      treeId={treeId ?? undefined}
                    />
                  </div>

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
        )}
      </main>

      <footer className="bg-[#FAF9F6] text-[#7A7570] text-xs font-medium py-8 border-t border-[#E5E1DA] mt-20 select-none text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 Kith & Kin. Built for deep pedigree charting.</p>
          <p className="text-[11px] font-mono">Cloud-backed family archive</p>
        </div>
      </footer>
    </div>
  );
}
