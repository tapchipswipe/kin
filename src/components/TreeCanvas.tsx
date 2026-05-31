/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FamilyMember } from '../types';
import { TreeLayout } from '../lib/lineageDb';
import { HERITAGE_COLORS, buildHeritageMap } from '../lib/heritageUtils';
import { 
  Heart, 
  Plus, 
  MapPin, 
  Briefcase, 
  Award, 
  ArrowUp, 
  ArrowDown, 
  Users,
  Layers,
  Network,
  Orbit,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  GitBranch
} from 'lucide-react';
import { motion } from 'motion/react';

interface TreeCanvasProps {
  members: FamilyMember[];
  focusId: string;
  anchorMemberId?: string | null;
  heritageMode?: boolean;
  layout: TreeLayout;
  onLayoutChange: (layout: TreeLayout) => void;
  onSelectFocus: (id: string) => void;
  onAddRelativeRequest: (memberId: string, type: 'father' | 'mother' | 'spouse' | 'child' | 'sibling') => void;
  onRegisterFirst?: () => void;
  /** Hub merge: show which tree each person came from */
  sourceBadges?: Record<string, string>;
  /** Hub merge: hide add-person placeholders */
  readOnly?: boolean;
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  members,
  focusId,
  anchorMemberId = null,
  heritageMode = false,
  layout,
  onLayoutChange,
  onSelectFocus,
  onAddRelativeRequest,
  onRegisterFirst,
  sourceBadges,
  readOnly = false,
}) => {

  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const handleToggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSetLayout = (newLayout: TreeLayout) => {
    onLayoutChange(newLayout);
  };

  // Find current focus member (anchor takes precedence in dualRoots layout)
  const focusMember = members.find((m) => m.id === focusId);
  const anchorMember = anchorMemberId ? members.find((m) => m.id === anchorMemberId) : null;
  const centerMember =
    (layout === 'dualRoots' || layout === 'mergedRoots') && anchorMember
      ? anchorMember
      : focusMember;

  const heritageMap = useMemo(
    () => buildHeritageMap(members, anchorMemberId ?? null),
    [members, anchorMemberId]
  );

  const getHeritageSideFor = (memberId: string) => heritageMap.get(memberId) ?? 'neutral';

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-[#E5E1DA] rounded-2xl bg-[#FAF9F6] text-[#7A7570] p-8 text-center">
        <Users className="w-12 h-12 mb-4 text-[#A8A29E]" />
        <h3 className="text-xl font-serif font-medium text-[#2D2926]">Your tree is empty</h3>
        <p className="text-sm mt-2 max-w-sm leading-relaxed">
          Add your first family member to start building your lineage chart.
        </p>
        {onRegisterFirst && (
          <button
            onClick={onRegisterFirst}
            className="mt-6 px-5 py-2.5 bg-[#2D2926] text-white rounded-lg text-sm font-bold hover:bg-[#1C1A18] cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add First Member
          </button>
        )}
      </div>
    );
  }

  if (!centerMember) {
    return (
      <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-stone-300 rounded-2xl bg-stone-50 text-stone-500 p-8 text-center">
        <Users className="w-12 h-12 mb-4 text-stone-400 animate-bounce" />
        <h3 className="text-xl font-serif font-medium text-stone-700">No Focus Member Selected</h3>
        <p className="text-sm mt-1 max-w-sm">Please select a family member from the index to begin charting their lineage.</p>
      </div>
    );
  }

  // --- Resolve Nodes surrounding the center ---
  const father = centerMember.fatherId ? members.find((m) => m.id === centerMember.fatherId) : null;
  const mother = centerMember.motherId ? members.find((m) => m.id === centerMember.motherId) : null;

  // Grandparents
  const paternalGrandfather = father?.fatherId ? members.find((m) => m.id === father.fatherId) : null;
  const paternalGrandmother = father?.motherId ? members.find((m) => m.id === father.motherId) : null;
  const maternalGrandfather = mother?.fatherId ? members.find((m) => m.id === mother.fatherId) : null;
  const maternalGrandmother = mother?.motherId ? members.find((m) => m.id === mother.motherId) : null;

  // Spouses
  const spouses = members.filter((m) => (centerMember.spouseIds ?? []).includes(m.id));

  const siblings = members.filter((m) => {
    if (m.id === centerMember.id) return false;
    const sameFather = centerMember.fatherId && m.fatherId === centerMember.fatherId;
    const sameMother = centerMember.motherId && m.motherId === centerMember.motherId;
    return sameFather || sameMother;
  });

  const children = members.filter((m) => (centerMember.childrenIds ?? []).includes(m.id));

  // Helper helper to format dates beautifully
  const getYearSpan = (m: FamilyMember) => {
    const bYear = m.birthDate ? m.birthDate.slice(0, 4) : '????';
    const dYear = m.isDeceased ? (m.deathDate ? m.deathDate.slice(0, 4) : 'Deceased') : 'Present';
    return `${bYear} – ${dYear}`;
  };

  // --- Dynamic Math Computations for Compact Radial Coordinates ---
  const fatherAngle = -120;
  const motherAngle = -60;

  const radialNodes = useMemo(() => {
    const list: { member: FamilyMember; role: string; r: number; angle: number }[] = [];

    // Focus center is always origin (r=0)
    list.push({ member: centerMember, role: 'Focus Center', r: 0, angle: 0 });

    // Inner Circle (Ring 1, r=130)
    if (father) {
      list.push({ member: father, role: 'Father', r: 130, angle: fatherAngle });
    }
    if (mother) {
      list.push({ member: mother, role: 'Mother', r: 130, angle: motherAngle });
    }

    // Spouses spaced on right (around 0 degrees)
    if (spouses.length === 1) {
      list.push({ member: spouses[0], role: 'Spouse', r: 130, angle: 0 });
    } else if (spouses.length > 1) {
      spouses.forEach((sp, idx) => {
        const offset = -20 + (idx * 40) / (spouses.length - 1);
        list.push({ member: sp, role: 'Spouse', r: 130, angle: offset });
      });
    }

    // Siblings spaced on left (around 180 degrees)
    if (siblings.length === 1) {
      list.push({ member: siblings[0], role: 'Sibling', r: 130, angle: 180 });
    } else if (siblings.length > 1) {
      siblings.forEach((sib, idx) => {
        const offset = 150 + (idx * 60) / (siblings.length - 1); // 150 to 210 degrees
        list.push({ member: sib, role: 'Sibling', r: 130, angle: offset });
      });
    }

    // Children spaced at the bottom (around 90 degrees)
    if (children.length === 1) {
      list.push({ member: children[0], role: 'Child', r: 130, angle: 90 });
    } else if (children.length > 1) {
      children.forEach((child, idx) => {
        const offset = 45 + (idx * 90) / (children.length - 1); // 45 to 135 degrees
        list.push({ member: child, role: 'Child', r: 130, angle: offset });
      });
    }

    // Outer Circle (Ring 2, r=260)
    if (paternalGrandfather) {
      list.push({ member: paternalGrandfather, role: 'Grandfather (Pat.)', r: 260, angle: -145 });
    }
    if (paternalGrandmother) {
      list.push({ member: paternalGrandmother, role: 'Grandmother (Pat.)', r: 260, angle: -100 });
    }
    if (maternalGrandfather) {
      list.push({ member: maternalGrandfather, role: 'Grandfather (Mat.)', r: 260, angle: -80 });
    }
    if (maternalGrandmother) {
      list.push({ member: maternalGrandmother, role: 'Grandmother (Mat.)', r: 260, angle: -35 });
    }

    // Grandchildren
    const grandchildren = children.flatMap((c) => members.filter((m) => (c.childrenIds ?? []).includes(m.id)));
    if (grandchildren.length === 1) {
      list.push({ member: grandchildren[0], role: 'Grandchild', r: 260, angle: 90 });
    } else if (grandchildren.length > 1) {
      grandchildren.forEach((gc, idx) => {
        const offset = 35 + (idx * 110) / (grandchildren.length - 1); // 35 to 145 degrees
        list.push({ member: gc, role: 'Grandchild', r: 260, angle: offset });
      });
    }

    return list;
  }, [
    centerMember,
    father,
    mother,
    spouses,
    siblings,
    children,
    paternalGrandfather,
    paternalGrandmother,
    maternalGrandfather,
    maternalGrandmother,
    members,
  ]);

  const getCoordinates = (r: number, angleDegrees: number) => {
    const radians = (angleDegrees * Math.PI) / 180;
    return {
      x: Math.round(r * Math.cos(radians)),
      y: Math.round(r * Math.sin(radians)),
    };
  };

  const getParentCoordinates = (member: FamilyMember, roleLabel: string) => {
    // Return origin (0,0) as fallback
    if (roleLabel.includes('Pat.') && father) {
      return getCoordinates(130, fatherAngle);
    }
    if (roleLabel.includes('Mat.') && mother) {
      return getCoordinates(130, motherAngle);
    }
    if (roleLabel === 'Grandchild') {
      // Find which child index matches this grandchild's parent
      const parent = children.find((c) => (c.childrenIds ?? []).includes(member.id));
      if (parent) {
        const idx = children.indexOf(parent);
        const parentAngle = children.length === 1 ? 90 : 45 + (idx * 90) / (children.length - 1);
        return getCoordinates(130, parentAngle);
      }
    }
    return { x: 0, y: 0 };
  };

  // Node Render Component
  const MemberNode = ({
    member,
    roleLabel,
    isActive = false,
    isCollapsed = false,
    onToggleCollapse,
    hasCollapsibleChildren = false,
    sideAccent,
  }: {
    member: FamilyMember;
    roleLabel: string;
    isActive?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: (id: string, e: React.MouseEvent) => void;
    hasCollapsibleChildren?: boolean;
    sideAccent?: 'maternal' | 'paternal' | 'neutral';
    key?: any;
  }) => {
    const side = sideAccent ?? getHeritageSideFor(member.id);
    const accent = HERITAGE_COLORS[side];
    return (
      <motion.div
        whileHover={{ 
          scale: 1.03, 
          y: -4,
          boxShadow: '0 12px 24px -10px rgba(45, 41, 38, 0.15), 0 4px 10px -2px rgba(45, 41, 38, 0.05)',
          borderColor: isActive ? '#2D2926' : '#7A7570'
        }}
        whileTap={{ scale: 0.98, y: -1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={`relative p-4 rounded-lg border bg-white text-left cursor-pointer overflow-hidden shadow-xs group ${
          isActive
            ? 'border-[#2D2926] ring-1 ring-[#2D2926]'
            : accent.border
        } ${heritageMode && side !== 'neutral' ? accent.bg : ''}`}
        onClick={() => onSelectFocus(member.id)}
      >
        <div>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#A8A29E]">
              {roleLabel}
            </span>
            {member.heritageLabel && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${accent.text} ${accent.bg} border ${accent.border}`}>
                {member.heritageLabel}
              </span>
            )}
            {sourceBadges?.[member.id] && (
              <span className="text-[8px] px-1.5 py-0.5 rounded font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 truncate max-w-[100px]">
                {sourceBadges[member.id]}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              {hasCollapsibleChildren && onToggleCollapse && (
                <button
                  onClick={(e) => onToggleCollapse(member.id, e)}
                  className="w-5 h-5 flex items-center justify-center rounded-md bg-[#FAF9F6] border border-[#E5E1DA] text-[#7A7570] hover:text-[#2D2926] hover:bg-stone-100 transition-colors focus:opacity-100 print:hidden"
                  title={isCollapsed ? "Expand sub-branch" : "Collapse sub-branch"}
                >
                  {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              )}
              {member.isDeceased && (
                 <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E5E1DA] text-[#7A7570] font-medium tracking-wide">
                  DECEASED
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            {(() => {
              const profileImage = member.media?.find(m => m.type === 'image');
              if (profileImage) {
                return (
                  <img 
                    src={profileImage.url} 
                    alt={member.firstName} 
                    className="w-10 h-10 rounded-full border border-[#E5E1DA] object-cover shrink-0 select-none shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                );
              }
              return (
                <span 
                  className="w-10 h-10 rounded-full border border-[#E5E1DA] flex items-center justify-center font-serif font-bold text-white text-base shrink-0 select-none pb-0.5 shadow-xs"
                  style={{ backgroundColor: member.avatarUrl || '#2D2926' }}
                >
                  {(member.firstName?.[0] ?? '?').toUpperCase()}
                </span>
              );
            })()}
            
            <div className="min-w-0 overflow-hidden">
              <h4 className="font-serif font-semibold text-[#2D2926] text-sm truncate leading-snug">
                {member.firstName} {member.lastName}
                {member.maidenName && (
                  <span className="text-[11px] text-[#7A7570] italic ml-1 font-sans font-normal">
                    (née {member.maidenName})
                  </span>
                )}
              </h4>
              
              <p className="font-mono text-[10px] text-[#7A7570] leading-none mt-1">
                {getYearSpan(member)}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-[#E5E1DA]/60 flex flex-col gap-1 text-[11px] text-[#7A7570]">
            {member.occupation && (
              <div className="flex items-center gap-1.5 truncate">
                <Briefcase className="w-3.5 h-3.5 text-[#A8A29E] shrink-0" />
                <span className="truncate">{member.occupation}</span>
              </div>
            )}
            {member.birthPlace && (
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3.5 h-3.5 text-[#A8A29E] shrink-0" />
                <span className="truncate">{member.birthPlace}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Placeholder Render Component
  const EmptyPlaceholderNode = ({
    targetId,
    type,
    label,
  }: {
    targetId: string;
    type: 'father' | 'mother' | 'spouse' | 'child' | 'sibling';
    label: string;
  }) => {
    if (readOnly) return null;
    return (
      <motion.button
        whileHover={{ 
          scale: 1.02, 
          y: -2,
          boxShadow: '0 8px 16px -6px rgba(45, 41, 38, 0.08)',
          borderColor: '#7A7570',
          backgroundColor: 'rgba(250, 249, 246, 0.8)' 
        }}
        whileTap={{ scale: 0.98, y: 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 24 }}
        className="h-full w-full min-h-[105px] border border-dashed border-[#E5E1DA] rounded-lg bg-[#FAF9F6]/40 flex flex-col items-center justify-center p-4 text-center cursor-pointer print:hidden"
        onClick={() => onAddRelativeRequest(targetId, type)}
      >
        <span className="p-1.5 rounded-full bg-white text-[#7A7570] border border-[#E5E1DA]">
          <Plus className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs font-semibold text-[#7A7570] mt-2">{label}</span>
      </motion.button>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Information Bar */}
      <div className="bg-white rounded-xl p-6 border border-[#E5E1DA] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] px-2.5 py-1 rounded bg-[#FAF9F6] border border-[#E5E1DA] text-[#7A7570] font-bold tracking-widest inline-block mb-2 uppercase">
            {(layout === 'dualRoots' || layout === 'mergedRoots') && anchorMember
              ? layout === 'mergedRoots'
                ? 'Expanded Family Junction'
                : 'Heritage Junction'
              : 'Active Focus Center'}
          </span>
          <h2 className="text-2xl font-serif font-bold text-[#2D2926]">
            {centerMember.firstName} {centerMember.lastName}
            {centerMember.maidenName && <span className="font-sans font-normal text-[#7A7570] text-lg"> (née {centerMember.maidenName})</span>}
          </h2>
          <p className="text-xs text-[#7A7570] mt-1 font-mono">
            REC: {centerMember.id} &bull; {centerMember.gender.toUpperCase()} &bull; {getYearSpan(centerMember)}
          </p>
        </div>
        {!readOnly && (
        <div className="flex items-center gap-2 self-start md:self-center shrink-0 print:hidden">
          <button
            onClick={() => onAddRelativeRequest(centerMember.id, 'spouse')}
            className="px-3.5 py-1.5 text-xs font-semibold border border-[#E5E1DA] rounded-lg hover:bg-[#FAF9F6] text-[#2D2926] flex items-center gap-1.5 cursor-pointer leading-snug"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            Add Spouse
          </button>
          <button
            onClick={() => onAddRelativeRequest(centerMember.id, 'child')}
            className="px-3.5 py-1.5 text-xs font-semibold border border-[#E5E1DA] rounded-lg hover:bg-[#FAF9F6] text-[#2D2926] flex items-center gap-1.5 cursor-pointer leading-snug"
          >
            <Plus className="w-3.5 h-3.5 text-[#2D2926]" />
            Add Child
          </button>
          <button
            onClick={() => onAddRelativeRequest(centerMember.id, 'sibling')}
            className="px-3.5 py-1.5 text-xs font-semibold border border-[#E5E1DA] rounded-lg hover:bg-[#FAF9F6] text-[#2D2926] flex items-center gap-1.5 cursor-pointer leading-snug"
          >
            <Users className="w-3.5 h-3.5 text-[#2D2926]" />
            Add Sibling
          </button>
        </div>
        )}
      </div>

      {/* 2. Style & Layout Control Bar */}
      {!readOnly && (
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl px-4 py-3 print:hidden">
        <span className="text-xs font-mono font-bold text-[#7A7570] flex items-center gap-1.5 uppercase select-none">
          <Layers className="w-3.5 h-3.5 text-stone-500" /> Blueprint View Layout:
        </span>
        <div className="flex items-center bg-white p-1 rounded-lg border border-[#E5E1DA] shadow-xs">
          <button
            onClick={() => handleSetLayout('hierarchical')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              layout === 'hierarchical'
                ? 'bg-[#2D2926] text-white'
                : 'text-[#7A7570] hover:text-[#2D2926] hover:bg-stone-50'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Pedigree Tree
          </button>
          <button
            onClick={() => handleSetLayout('radial')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              layout === 'radial'
                ? 'bg-[#2D2926] text-white'
                : 'text-[#7A7570] hover:text-[#2D2926] hover:bg-stone-50'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            Radial Constellation
          </button>
          {heritageMode && (
            <button
              onClick={() => handleSetLayout('dualRoots')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                layout === 'dualRoots'
                  ? 'bg-[#2D2926] text-white'
                  : 'text-[#7A7570] hover:text-[#2D2926] hover:bg-stone-50'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Dual Roots
            </button>
          )}
          <button
            onClick={() => handleSetLayout('grid')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              layout === 'grid'
                ? 'bg-[#2D2926] text-white'
                : 'text-[#7A7570] hover:text-[#2D2926] hover:bg-stone-50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Compact Grid Directory
          </button>
        </div>
      </div>
      )}

      {/* 3. Conditional Layout Renderer */}
      {(layout === 'hierarchical' || (layout === 'mergedRoots' && !anchorMember)) && (
        <div className="space-y-10 relative">
          {/* --- GRID TIER 1: GRANDPARENTS (Great Ancestry Index) --- */}
          {((father && !collapsedNodes.has(father.id)) || (mother && !collapsedNodes.has(mother.id)) || (!father && !mother)) && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-[1px] bg-[#E5E1DA] grow" />
                <h3 className="text-[10px] font-bold tracking-widest text-[#A8A29E] uppercase flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" /> Grandparents & Ancestors
                </h3>
                <span className="h-[1px] bg-[#E5E1DA] grow" />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-4">
                {/* Paternal Side */}
                {(!father || !collapsedNodes.has(father.id)) && (
                  <>
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold tracking-widest text-[#A8A29E] block text-center">PATERNAL GRANDFATHER</span>
                      {paternalGrandfather ? (
                        <MemberNode member={paternalGrandfather} roleLabel="Grandfather" />
                      ) : (
                        <EmptyPlaceholderNode 
                          targetId={father?.id || ''} 
                          type="father" 
                          label={father ? `Add ${father.firstName}'s Father` : 'Grandfather'} 
                        />
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold tracking-widest text-[#A8A29E] block text-center">PATERNAL GRANDMOTHER</span>
                      {paternalGrandmother ? (
                        <MemberNode member={paternalGrandmother} roleLabel="Grandmother" />
                      ) : (
                        <EmptyPlaceholderNode 
                          targetId={father?.id || ''} 
                          type="mother" 
                          label={father ? `Add ${father.firstName}'s Mother` : 'Grandmother'} 
                        />
                      )}
                    </div>
                  </>
                )}

                {/* Maternal Side */}
                {(!mother || !collapsedNodes.has(mother.id)) && (
                  <>
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold tracking-widest text-[#A8A29E] block text-center">MATERNAL GRANDFATHER</span>
                      {maternalGrandfather ? (
                        <MemberNode member={maternalGrandfather} roleLabel="Grandfather" />
                      ) : (
                        <EmptyPlaceholderNode 
                          targetId={mother?.id || ''} 
                          type="father" 
                          label={mother ? `Add ${mother.firstName}'s Father` : 'Grandfather'} 
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-bold tracking-widest text-[#A8A29E] block text-center">MATERNAL GRANDMOTHER</span>
                      {maternalGrandmother ? (
                        <MemberNode member={maternalGrandmother} roleLabel="Grandmother" />
                      ) : (
                        <EmptyPlaceholderNode 
                          targetId={mother?.id || ''} 
                          type="mother" 
                          label={mother ? `Add ${mother.firstName}'s Mother` : 'Grandmother'} 
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* --- GRID TIER 2: PARENTS --- */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-[1px] bg-[#E5E1DA] grow" />
              <h3 className="text-[10px] font-bold tracking-widest text-[#A8A29E] uppercase flex items-center gap-1.5">
                <ArrowUp className="w-3.5 h-3.5" /> Parents of {centerMember.firstName}
              </h3>
              <span className="h-[1px] bg-[#E5E1DA] grow" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="space-y-2">
                <span className="text-[9px] font-bold tracking-widest text-[#A8A29E] block text-center">FATHER</span>
                {father ? (
                  <MemberNode 
                    member={father} 
                    roleLabel="Father" 
                    isCollapsed={collapsedNodes.has(father.id)}
                    hasCollapsibleChildren={true}
                    onToggleCollapse={handleToggleCollapse}
                  />
                ) : (
                  <EmptyPlaceholderNode targetId={centerMember.id} type="father" label="Add Father" />
                )}
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-bold tracking-widest text-[#A8A29E] block text-center">MOTHER</span>
                {mother ? (
                  <MemberNode 
                    member={mother} 
                    roleLabel="Mother" 
                    isCollapsed={collapsedNodes.has(mother.id)}
                    hasCollapsibleChildren={true}
                    onToggleCollapse={handleToggleCollapse}
                  />
                ) : (
                  <EmptyPlaceholderNode targetId={centerMember.id} type="mother" label="Add Mother" />
                )}
              </div>
            </div>
          </section>

          {/* --- GRID TIER 3: FOCUS & SPOUSES & SIBLINGS (CENTER OF THE CONSTELLATION) --- */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-[1px] bg-[#E5E1DA] grow" />
              <h3 className="text-[10px] font-bold tracking-widest text-[#A8A29E] uppercase">
                Spotlight, Spouses &amp; Siblings
              </h3>
              <span className="h-[1px] bg-[#E5E1DA] grow" />
            </div>

            <div className="bg-[#FAF9F6] p-6 rounded-xl border border-[#E5E1DA] space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 print:grid-cols-12 gap-6 items-stretch">
                
                {/* Siblings Block */}
                <div className="lg:col-span-3 print:col-span-3 space-y-2">
                  <span className="text-[9px] font-bold text-[#A8A29E] block uppercase tracking-widest">Siblings ({siblings.length})</span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {siblings.length > 0 ? (
                      siblings.map((sib) => (
                        <MemberNode key={sib.id} member={sib} roleLabel="Sibling" />
                      ))
                    ) : (
                      <EmptyPlaceholderNode
                        targetId={centerMember.id}
                        type="sibling"
                        label="Add Sibling"
                      />
                    )}
                  </div>
                </div>

                {/* ACTIVE FOCUS MEMBER (Centered spotlight!) */}
                <div className="lg:col-span-5 print:col-span-5 flex flex-col justify-center">
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-[#7A7570] text-center block uppercase tracking-widest">Selected Member Focus</span>
                    <MemberNode member={centerMember} roleLabel="Focus Member" isActive={true} />
                  </div>
                </div>

                {/* Spouses Block */}
                <div className="lg:col-span-4 print:col-span-4 space-y-2">
                  <span className="text-[9px] font-bold text-[#A8A29E] block uppercase tracking-widest">Spouse / Spouses ({spouses.length})</span>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {spouses.length > 0 ? (
                      spouses.map((sp) => (
                        <MemberNode key={sp.id} member={sp} roleLabel="Spouse" />
                      ))
                    ) : (
                      <EmptyPlaceholderNode targetId={centerMember.id} type="spouse" label="Add Spouse to Chart" />
                    )}
                  </div>
                </div>

              </div>
            </div>
          </section>
          
          {/* --- GRID TIER 4: CHILDREN --- */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-[1px] bg-[#E5E1DA] grow" />
              <h3 className="text-[10px] font-bold tracking-widest text-[#A8A29E] uppercase flex items-center gap-1.5">
                <ArrowDown className="w-3.5 h-3.5" /> Children of {centerMember.firstName} ({children.length})
              </h3>
              <span className="h-[1px] bg-[#E5E1DA] grow" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-4">
              {children.length > 0 ? (
                children.map((child) => (
                  <MemberNode 
                    key={child.id} 
                    member={child} 
                    roleLabel="Child" 
                    isCollapsed={collapsedNodes.has(child.id)}
                    hasCollapsibleChildren={(child.childrenIds ?? []).length > 0}
                    onToggleCollapse={handleToggleCollapse}
                  />
                ))
              ) : (
                <div className="col-span-full max-w-sm mx-auto w-full">
                  <EmptyPlaceholderNode targetId={centerMember.id} type="child" label="Add First Child" />
                </div>
              )}
              {children.length > 0 && (
                <div className="col-span-1 min-h-[105px]">
                  <EmptyPlaceholderNode targetId={centerMember.id} type="child" label="Add Another Child" />
                </div>
              )}
            </div>
          </section>

          {/* --- GRID TIER 5: GRANDCHILDREN --- */}
          {children.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-[1px] bg-[#E5E1DA] grow" />
                <h3 className="text-[10px] font-bold tracking-widest text-[#A8A29E] uppercase">
                  Grandchildren
                </h3>
                <span className="h-[1px] bg-[#E5E1DA] grow" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 print:grid-cols-6 gap-3">
                {(() => {
                  const visibleGrandchildren = children
                    .filter((c) => !collapsedNodes.has(c.id))
                    .flatMap((c) => 
                      members.filter((m) => (c.childrenIds ?? []).includes(m.id)).map(gc => ({ gc, parent: c }))
                    );
                  
                  if (visibleGrandchildren.length > 0) {
                    return visibleGrandchildren.map(({ gc, parent }) => (
                      <div key={gc.id} className="space-y-1">
                        <span className="text-[8px] text-[#7A7570] block text-center uppercase truncate">From {parent.firstName}</span>
                        <MemberNode member={gc} roleLabel="Grandchild" />
                      </div>
                    ));
                  } else if (children.every(c => collapsedNodes.has(c.id)) && children.flatMap(c => c.childrenIds ?? []).length > 0) {
                     return (
                      <div className="col-span-full py-6 text-center text-xs text-[#7A7570] italic bg-[#FAF9F6] rounded-lg border border-dashed border-[#E5E1DA] max-w-sm mx-auto w-full print:hidden">
                        Grandchildren branches are currently collapsed.
                      </div>
                     );
                  } else {
                    return (
                      <div className="col-span-full py-6 text-center text-xs text-[#7A7570] italic bg-[#FAF9F6] rounded-lg border border-dashed border-[#E5E1DA] max-w-sm mx-auto w-full print:hidden">
                        No grandchildren recorded yet. Highlight any child node above and add their descendants!
                      </div>
                    );
                  }
                })()}
              </div>
            </section>
          )}
        </div>
      )}

      {layout === 'radial' && (
        <div className="overflow-x-auto overflow-y-hidden py-6 border border-[#E5E1DA] rounded-xl bg-[#FAF9F6]/40 flex justify-center">
          <div className="relative shrink-0" style={{ width: '800px', height: '540px' }}>
            
            {/* Radial constellation canvas visual guides */}
            <svg viewBox="-400 -270 800 540" className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <circle cx="0" cy="0" r="130" fill="none" stroke="#7A7570" strokeWidth="1" strokeDasharray="3,4" />
              <circle cx="0" cy="0" r="260" fill="none" stroke="#7A7570" strokeWidth="1" strokeDasharray="3,4" />
              <line x1="-380" y1="0" x2="380" y2="0" stroke="#E5E1DA" strokeWidth="1" strokeDasharray="2,2" />
              <line x1="0" y1="-250" x2="0" y2="250" stroke="#E5E1DA" strokeWidth="1" strokeDasharray="2,2" />

              {/* Draw dynamic orbital connection lines */}
              {radialNodes.map((node, index) => {
                if (node.r === 0) return null;
                const { x, y } = getCoordinates(node.r, node.angle);
                const parentCoords = getParentCoordinates(node.member, node.role);
                return (
                  <line
                    key={`radial-line-${index}`}
                    x1={parentCoords.x}
                    y1={parentCoords.y}
                    x2={x}
                    y2={y}
                    stroke="#7A7570"
                    strokeWidth="1.25"
                    strokeDasharray="2,3"
                  />
                );
              })}
            </svg>

            {/* Render radial interactive nodes */}
            {radialNodes.map((item) => {
              const { x, y } = getCoordinates(item.r, item.angle);
              const isCurrentFocus = item.r === 0;

              return (
                <div
                  key={item.member.id + '-' + item.role}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-300"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2, zIndex: 40 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectFocus(item.member.id)}
                    className={`w-38 p-2 rounded-lg border text-center cursor-pointer shadow-xs select-none bg-white transition-all ${
                      isCurrentFocus
                        ? 'border-[#2D2926] ring-1 ring-[#2D2926] bg-[#FAF9F6]'
                        : 'border-[#E5E1DA] hover:border-[#7A7570]'
                    }`}
                  >
                    <span className="text-[7.5px] font-bold text-[#A8A29E] uppercase tracking-wider block font-mono">
                      {item.role}
                    </span>
                    <h5 className="font-serif font-bold text-[#2D2926] text-[11px] truncate mt-0.5 leading-tight">
                      {item.member.firstName} {item.member.lastName}
                    </h5>
                    <span className="text-[8.5px] font-mono text-[#7A7570] block leading-none mt-0.5">
                      {getYearSpan(item.member)}
                    </span>
                  </motion.div>
                </div>
              );
            })}

          </div>
        </div>
      )}

      {layout === 'grid' && (
        <div className="space-y-6">
          <div className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 text-[#7A7570] text-xs text-left">
            Compact grouped list of all active relatives in <strong>{centerMember.firstName}'s</strong> immediate lineage. Click any card to set them as the focus member.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-6">
            
            {/* Category 1: Ancestors */}
            <div className="space-y-3 text-left">
              <h4 className="text-[10px] font-bold font-mono text-[#7A7570] uppercase bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg px-3 py-1.5 flex items-center gap-1.5 select-none font-semibold">
                <ArrowUp className="w-3.5 h-3.5" /> Ancestry &amp; Parents
              </h4>
              <div className="space-y-2">
                {father && <MemberNode member={father} roleLabel="Father" />}
                {mother && <MemberNode member={mother} roleLabel="Mother" />}
                {paternalGrandfather && <MemberNode member={paternalGrandfather} roleLabel="Pat. Grandfather" />}
                {paternalGrandmother && <MemberNode member={paternalGrandmother} roleLabel="Pat. Grandmother" />}
                {maternalGrandfather && <MemberNode member={maternalGrandfather} roleLabel="Mat. Grandfather" />}
                {maternalGrandmother && <MemberNode member={maternalGrandmother} roleLabel="Mat. Grandmother" />}
                {!father && !mother && !paternalGrandfather && !paternalGrandmother && !maternalGrandfather && !maternalGrandmother && (
                  <div className="text-xs text-[#7A7570] italic p-4 text-center border border-dashed border-[#E5E1DA] rounded-lg bg-white select-none">
                    No ancestors recorded.
                  </div>
                )}
              </div>
            </div>

            {/* Category 2: Spouses */}
            <div className="space-y-3 text-left">
              <h4 className="text-[10px] font-bold font-mono text-[#7A7570] uppercase bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg px-3 py-1.5 flex items-center gap-1.5 select-none font-semibold">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Partnerships &amp; Spouses
              </h4>
              <div className="space-y-2">
                {spouses.length > 0 ? (
                  spouses.map(spouse => (
                    <MemberNode key={spouse.id} member={spouse} roleLabel="Spouse" />
                  ))
                ) : (
                  <div className="text-xs text-[#7A7570] italic p-4 text-center border border-dashed border-[#E5E1DA] rounded-lg bg-white select-none">
                    No spouses recorded.
                  </div>
                )}
              </div>
            </div>

            {/* Category 3: Siblings */}
            <div className="space-y-3 text-left">
              <h4 className="text-[10px] font-bold font-mono text-[#7A7570] uppercase bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg px-3 py-1.5 flex items-center gap-1.5 select-none font-semibold">
                <Users className="w-3.5 h-3.5" /> Siblings &amp; Kin
              </h4>
              <div className="space-y-2">
                {siblings.length > 0 ? (
                  siblings.map((sibling) => (
                    <MemberNode key={sibling.id} member={sibling} roleLabel="Sibling" />
                  ))
                ) : (
                  <EmptyPlaceholderNode
                    targetId={centerMember.id}
                    type="sibling"
                    label="Add Sibling"
                  />
                )}
              </div>
            </div>

            {/* Category 4: Descendants */}
            <div className="space-y-3 text-left">
              <h4 className="text-[10px] font-bold font-mono text-[#7A7570] uppercase bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg px-3 py-1.5 flex items-center gap-1.5 select-none font-semibold">
                <ArrowDown className="w-3.5 h-3.5" /> Descendants &amp; Children
              </h4>
              <div className="space-y-2">
                {children.map(child => (
                  <MemberNode key={child.id} member={child} roleLabel="Child" />
                ))}
                {children.length > 0 && children.flatMap(c => members.filter(m => (c.childrenIds ?? []).includes(m.id))).map(gChild => (
                  <MemberNode key={gChild.id} member={gChild} roleLabel="Grandchild" />
                ))}
                {children.length === 0 && (
                  <div className="text-xs text-[#7A7570] italic p-4 text-center border border-dashed border-[#E5E1DA] rounded-lg bg-white select-none">
                    No descendants recorded.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {(layout === 'dualRoots' || (layout === 'mergedRoots' && anchorMember)) && (
        <div className="space-y-8 relative">
          <div className="text-center text-xs text-[#7A7570] bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 max-w-2xl mx-auto">
            {layout === 'mergedRoots'
              ? 'Trees connected at link points — each person keeps their source tree. Details are combined in this expanded view.'
              : 'Both heritage lines meet here. Build each branch upward — maternal on the left, paternal on the right.'}
          </div>

          {/* Grandparents row — split by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Maternal branch */}
            <section className="space-y-4 rounded-xl border-2 border-rose-200 bg-rose-50/30 p-5">
              <h3 className="text-[10px] font-bold tracking-widest text-rose-700 uppercase text-center flex items-center justify-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                {mother?.heritageLabel || 'Maternal Line'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <span className="text-[9px] font-bold tracking-widest text-rose-600 block text-center">GRANDFATHER</span>
                  {maternalGrandfather ? (
                    <MemberNode member={maternalGrandfather} roleLabel="Grandfather" sideAccent="maternal" />
                  ) : (
                    <EmptyPlaceholderNode targetId={mother?.id || centerMember.id} type="father" label="Add Grandfather" />
                  )}
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-bold tracking-widest text-rose-600 block text-center">GRANDMOTHER</span>
                  {maternalGrandmother ? (
                    <MemberNode member={maternalGrandmother} roleLabel="Grandmother" sideAccent="maternal" />
                  ) : (
                    <EmptyPlaceholderNode targetId={mother?.id || centerMember.id} type="mother" label="Add Grandmother" />
                  )}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <span className="text-[9px] font-bold tracking-widest text-rose-600 block text-center">MOTHER</span>
                {mother ? (
                  <MemberNode member={mother} roleLabel="Mother" sideAccent="maternal" />
                ) : (
                  <EmptyPlaceholderNode targetId={centerMember.id} type="mother" label="Add Mother" />
                )}
              </div>
            </section>

            {/* Paternal branch */}
            <section className="space-y-4 rounded-xl border-2 border-sky-200 bg-sky-50/30 p-5">
              <h3 className="text-[10px] font-bold tracking-widest text-sky-700 uppercase text-center flex items-center justify-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                {father?.heritageLabel || 'Paternal Line'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <span className="text-[9px] font-bold tracking-widest text-sky-600 block text-center">GRANDFATHER</span>
                  {paternalGrandfather ? (
                    <MemberNode member={paternalGrandfather} roleLabel="Grandfather" sideAccent="paternal" />
                  ) : (
                    <EmptyPlaceholderNode targetId={father?.id || centerMember.id} type="father" label="Add Grandfather" />
                  )}
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-bold tracking-widest text-sky-600 block text-center">GRANDMOTHER</span>
                  {paternalGrandmother ? (
                    <MemberNode member={paternalGrandmother} roleLabel="Grandmother" sideAccent="paternal" />
                  ) : (
                    <EmptyPlaceholderNode targetId={father?.id || centerMember.id} type="mother" label="Add Grandmother" />
                  )}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <span className="text-[9px] font-bold tracking-widest text-sky-600 block text-center">FATHER</span>
                {father ? (
                  <MemberNode member={father} roleLabel="Father" sideAccent="paternal" />
                ) : (
                  <EmptyPlaceholderNode targetId={centerMember.id} type="father" label="Add Father" />
                )}
              </div>
            </section>
          </div>

          {/* Junction — anchor at center */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-[1px] bg-gradient-to-r from-rose-300 via-[#E5E1DA] to-sky-300 grow" />
              <h3 className="text-[10px] font-bold tracking-widest text-[#2D2926] uppercase flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" /> Where Heritages Meet
              </h3>
              <span className="h-[1px] bg-gradient-to-r from-sky-300 via-[#E5E1DA] to-rose-300 grow" />
            </div>
            <div className="max-w-md mx-auto">
              <MemberNode
                member={centerMember}
                roleLabel={centerMember.isAnchor ? 'You — Anchor' : 'Heritage Junction'}
                isActive={true}
                sideAccent="neutral"
              />
            </div>
          </section>

          {/* Children below */}
          {children.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-[1px] bg-[#E5E1DA] grow" />
                <h3 className="text-[10px] font-bold tracking-widest text-[#A8A29E] uppercase flex items-center gap-1.5">
                  <ArrowDown className="w-3.5 h-3.5" /> Descendants
                </h3>
                <span className="h-[1px] bg-[#E5E1DA] grow" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {children.map((child) => (
                  <MemberNode key={child.id} member={child} roleLabel="Child" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
