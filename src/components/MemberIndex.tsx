/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FamilyMember } from '../types';
import { Search, UserMinus, Eye, Edit2, ShieldAlert, Heart, Sparkles, Filter, Check, Calendar } from 'lucide-react';
import { getEraLabel } from '../utils';

interface MemberIndexProps {
  members: FamilyMember[];
  onSelectMember: (id: string) => void;
  onEditMember: (id: string) => void;
  onDeleteMember: (id: string) => void;
  onViewTree: (id: string) => void;
}

export const MemberIndex: React.FC<MemberIndexProps> = ({
  members,
  onSelectMember,
  onEditMember,
  onDeleteMember,
  onViewTree,
}) => {
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'living' | 'deceased'>('all');
  const [eraFilter, setEraFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'birth' | 'relations'>('name');

  // Multi-item delete verification
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Compute all available eras in this tree
  const uniqueEras = useMemo(() => {
    const eras = new Set<string>();
    members.forEach((m) => {
      const { era } = getEraLabel(m.birthDate);
      if (era) eras.add(era);
    });
    return Array.from(eras);
  }, [members]);

  // Combined search, filtering, and sorting
  const filteredMembers = useMemo(() => {
    let result = [...members];

    // Search query
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter((m) => {
        const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
        const bio = (m.biography || '').toLowerCase();
        const occ = (m.occupation || '').toLowerCase();
        const bPlace = (m.birthPlace || '').toLowerCase();
        const maiden = (m.maidenName || '').toLowerCase();
        return (
          fullName.includes(q) ||
          bio.includes(q) ||
          occ.includes(q) ||
          bPlace.includes(q) ||
          maiden.includes(q)
        );
      });
    }

    // Gender filter
    if (genderFilter !== 'all') {
      result = result.filter((m) => m.gender === genderFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((m) => (statusFilter === 'deceased' ? m.isDeceased : !m.isDeceased));
    }

    // Era filter
    if (eraFilter !== 'all') {
      result = result.filter((m) => getEraLabel(m.birthDate).era === eraFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'birth') {
        const birthA = parseInt(a.birthDate?.slice(0, 4) || '9999');
        const birthB = parseInt(b.birthDate?.slice(0, 4) || '9999');
        return birthA - birthB;
      }
      if (sortBy === 'relations') {
        const scoreA =
          (a.childrenIds ?? []).length +
          (a.spouseIds ?? []).length +
          (a.fatherId ? 1 : 0) +
          (a.motherId ? 1 : 0);
        const scoreB =
          (b.childrenIds ?? []).length +
          (b.spouseIds ?? []).length +
          (b.fatherId ? 1 : 0) +
          (b.motherId ? 1 : 0);
        // Desending connection strength
        return scoreB - scoreA;
      }
      return 0;
    });

    return result;
  }, [members, search, genderFilter, statusFilter, eraFilter, sortBy]);

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleExecuteDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteMember(id);
    setDeletingId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Stats Summary */}
      <div className="bg-[#FAF9F6] p-6 rounded-xl border border-[#E5E1DA] flex flex-wrap gap-6 justify-between items-center">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#2D2926]">Family Directory Index</h2>
          <p className="text-xs text-[#7A7570] mt-1">
            Search, sort, and filter through the complete register of {members.length} registered ancestors and descendants.
          </p>
        </div>

        {/* Quick totals */}
        <div className="flex gap-6">
          <div className="border-l border-[#E5E1DA] pl-3.5">
            <span className="text-[10px] text-[#A8A29E] block uppercase font-bold tracking-wider">Living Kin</span>
            <span className="text-lg font-serif font-bold text-[#2D2926]">
              {members.filter((m) => !m.isDeceased).length}
            </span>
          </div>
          <div className="border-l border-[#E5E1DA] pl-3.5">
            <span className="text-[10px] text-[#A8A29E] block uppercase font-bold tracking-wider">Ancestors</span>
            <span className="text-lg font-serif font-bold text-[#2D2926]">
              {members.filter((m) => m.isDeceased).length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Advanced Search & Filtering Console */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E1DA] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search phrase */}
          <div className="relative md:col-span-4">
            <Search className="w-4 h-4 text-[#A8A29E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, place, role, biography..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-4 pl-10 py-2.5 text-xs focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden transition-all duration-150"
            />
          </div>

          {/* Gender Filter */}
          <div className="md:col-span-2">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as any)}
              className="w-full text-[#2D2926] bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg px-3 py-2.5 text-xs focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden cursor-pointer"
            >
              <option value="all">All Genders</option>
              <option value="male">Male Only</option>
              <option value="female">Female Only</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-[#2D2926] bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg px-3 py-2.5 text-xs focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden cursor-pointer"
            >
              <option value="all">Any Life Status</option>
              <option value="living">Living Only</option>
              <option value="deceased">Deceased Only</option>
            </select>
          </div>

          {/* Era Filter */}
          <div className="md:col-span-2">
            <select
              value={eraFilter}
              onChange={(e) => setEraFilter(e.target.value)}
              className="w-full text-[#2D2926] bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg px-3 py-2.5 text-xs focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden cursor-pointer"
            >
              <option value="all">Any Ancestral Era</option>
              {uniqueEras.map((era) => (
                <option key={era} value={era}>
                  {era}
                </option>
              ))}
            </select>
          </div>

          {/* Sorting */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-[#2D2926] bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg px-3 py-2.5 text-xs focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden cursor-pointer"
            >
              <option value="name">Sort by: Family Name</option>
              <option value="birth">Sort by: Birth Year</option>
              <option value="relations">Sort by: Kin Connections</option>
            </select>
          </div>
        </div>

        {/* Filters Quick Feedback */}
        {(genderFilter !== 'all' || statusFilter !== 'all' || eraFilter !== 'all' || search !== '') && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-bold text-[#A8A29E] uppercase flex items-center gap-1 tracking-wider">
              <Filter className="w-3 h-3" /> Filters Active:
            </span>
            <div className="flex flex-wrap gap-1">
              {search && (
                <span className="text-[10px] bg-[#FAF9F6] border border-[#E5E1DA] font-mono text-[#7A7570] px-2 py-0.5 rounded">
                  Query: "{search}"
                </span>
              )}
              {genderFilter !== 'all' && (
                <span className="text-[10px] bg-[#FAF9F6] border border-[#E5E1DA] font-mono text-[#7A7570] px-2 py-0.5 rounded">
                  {genderFilter.toUpperCase()}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="text-[10px] bg-[#FAF9F6] border border-[#E5E1DA] font-mono text-[#7A7570] px-2 py-0.5 rounded">
                  {statusFilter.toUpperCase()}
                </span>
              )}
              {eraFilter !== 'all' && (
                <span className="text-[10px] bg-[#FAF9F6] border border-[#E5E1DA] font-mono text-[#7A7570] px-2 py-0.5 rounded">
                  {eraFilter}
                </span>
              )}
              <button
                onClick={() => {
                  setSearch('');
                  setGenderFilter('all');
                  setStatusFilter('all');
                  setEraFilter('all');
                }}
                className="text-[10px] text-rose-600 hover:underline font-bold ml-2 cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. List Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((m) => {
            const eraObj = getEraLabel(m.birthDate);
            const spouseCount = (m.spouseIds ?? []).length;
            const childrenCount = (m.childrenIds ?? []).length;

            return (
              <div
                key={m.id}
                onClick={() => onSelectMember(m.id)}
                className="group relative bg-white border border-[#E5E1DA] rounded-lg hover:border-[#2D2926] transition-all duration-300 p-5 flex flex-col justify-between cursor-pointer"
              >
                <div className="space-y-3">
                  {/* Top line ID/Era */}
                  <div className="flex items-center justify-between text-[9px] font-mono font-bold uppercase tracking-wider text-[#A8A29E]">
                    <span className="truncate max-w-[130px]" title={eraObj.era}>
                      {eraObj.era}
                    </span>
                    <span className="shrink-0 bg-[#FAF9F6] border border-[#E5E1DA] px-1.5 py-0.5 rounded">
                      ID: {m.id}
                    </span>
                  </div>

                  {/* Name */}
                  <div>
                    <h3 className="font-serif font-bold text-[#2D2926] text-base group-hover:underline decoration-1 decoration-[#2D2926] transition-all">
                      {m.firstName} {m.lastName}
                      {m.maidenName && (
                        <span className="text-xs text-[#7A7570] block font-normal italic font-sans">
                          née {m.maidenName}
                        </span>
                      )}
                    </h3>
                    <p className="font-mono text-xs text-[#7A7570] mt-1">
                      {m.birthDate ? m.birthDate.slice(0, 4) : '????'}
                      {' – '}
                      {m.isDeceased ? (m.deathDate ? m.deathDate.slice(0, 4) : 'Deceased') : 'Present'}
                    </p>
                  </div>

                  {/* Quick description metadata */}
                  <div className="space-y-1.5 pt-3 border-t border-[#E5E1DA]/60 text-[11px] text-[#7A7570]">
                    {m.occupation && (
                      <div className="flex items-center gap-1.5 font-sans truncate">
                        <span className="text-[#A8A29E] font-medium uppercase text-[9px] tracking-wider">Occupation:</span>
                        <span className="font-medium truncate text-[#2D2926]">{m.occupation}</span>
                      </div>
                    )}
                    {m.birthPlace && (
                      <div className="flex items-center gap-1.5 font-sans truncate" title={m.birthPlace}>
                        <span className="text-[#A8A29E] font-medium uppercase text-[9px] tracking-wider">Born:</span>
                        <span className="font-medium truncate text-[#2D2926]">{m.birthPlace}</span>
                      </div>
                    )}
                    {/* Connections list */}
                    <div className="flex items-center gap-1.5 pt-1.5 text-[9px] font-mono text-[#7A7570] font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E5E1DA]">
                        SPOUSES: {spouseCount}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E5E1DA]">
                        CHILDREN: {childrenCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Interactive Row */}
                <div className="mt-5 pt-3 border-t border-[#E5E1DA]/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      title="View Lineage Chart"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewTree(m.id);
                      }}
                      className="text-[#7A7570] hover:text-[#2D2926] hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Chart
                    </button>
                    <button
                      title="Edit Bio/Relationships"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditMember(m.id);
                      }}
                      className="text-[#7A7570] hover:text-[#2D2926] hover:underline flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>

                  {/* Absolute confirmation for Deletion to avoid accident */}
                  {deletingId === m.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-rose-600 animate-pulse flex items-center gap-0.5 uppercase tracking-wider">
                        <ShieldAlert className="w-3 h-3" /> Delete?
                      </span>
                      <button
                        onClick={(e) => handleExecuteDelete(m.id, e)}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-bold cursor-pointer transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={handleCancelDelete}
                        className="px-2 py-0.5 bg-[#F5F2EF] hover:bg-[#E5E1DA] text-[#2D2926] rounded text-[9px] font-bold cursor-pointer transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      title="Remove Member cleanly"
                      onClick={(e) => confirmDelete(m.id, e)}
                      className="text-[#A8A29E] hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center border border-dashed border-[#E5E1DA] bg-[#FAF9F6]/40 rounded-xl max-w-md mx-auto w-full p-8">
            <Search className="w-8 h-8 text-[#A8A29E] mx-auto mb-3" />
            <h4 className="font-serif font-bold text-[#2D2926] text-lg">No matches found</h4>
            <p className="text-xs text-[#7A7570] mt-2 leading-relaxed">
              Try adjusting your query, selecting 'Any Ancestral Era', or widening your life-status filters.
            </p>
            {(genderFilter !== 'all' || statusFilter !== 'all' || eraFilter !== 'all' || search !== '') && (
              <button
                onClick={() => {
                  setSearch('');
                  setGenderFilter('all');
                  setStatusFilter('all');
                  setEraFilter('all');
                }}
                className="mt-4 px-3.5 py-1.5 text-xs bg-[#2D2926] hover:bg-stone-800 text-white rounded-lg font-semibold cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
