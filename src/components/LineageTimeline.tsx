/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { FamilyMember } from '../types';
import { Calendar, Search, MapPin, User, ChevronRight, Award, History } from 'lucide-react';
import { getEraLabel } from '../utils';

interface LineageTimelineProps {
  members: FamilyMember[];
  onSelectMember: (id: string) => void;
  onViewTree: (id: string) => void;
}

interface UnifiedTimelineEvent {
  year: number;
  type: 'birth' | 'death' | 'milestone';
  title: string;
  description?: string;
  location?: string;
  memberId: string;
  memberName: string;
  themeColor: string;
}

export const LineageTimeline: React.FC<LineageTimelineProps> = ({
  members,
  onSelectMember,
  onViewTree,
}) => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'birth' | 'death' | 'milestone'>('all');

  // Compile and sort all timeline events
  const sortedEvents = useMemo(() => {
    const list: UnifiedTimelineEvent[] = [];

    members.forEach((m) => {
      const name = `${m.firstName} ${m.lastName}`;
      const color = m.avatarUrl || '#78909c';

      // 1. Biological Birth
      if (m.birthDate) {
        const year = parseInt(m.birthDate.slice(0, 4));
        if (!isNaN(year)) {
          list.push({
            year,
            type: 'birth',
            title: `Birth of ${name}`,
            description: m.occupation 
              ? `Entering the line of descendants. Later became a known ${m.occupation.toLowerCase()}.` 
              : `Entering the line of descendants representing a new registry.`,
            location: m.birthPlace || 'Location unrecorded',
            memberId: m.id,
            memberName: name,
            themeColor: color,
          });
        }
      }

      // 2. Biological Death
      if (m.isDeceased && m.deathDate) {
        const year = parseInt(m.deathDate.slice(0, 4));
        if (!isNaN(year)) {
          list.push({
            year,
            type: 'death',
            title: `Passing of ${name}`,
            description: `Resting peacefully, leaving behind a lasting legacy in the family lineage index.`,
            location: m.deathPlace || 'Location unrecorded',
            memberId: m.id,
            memberName: name,
            themeColor: color,
          });
        }
      }

      // 3. Custom Explicit Event milestones
      if (m.events && m.events.length > 0) {
        m.events.forEach((evt) => {
          list.push({
            year: evt.year,
            type: 'milestone',
            title: evt.title,
            description: evt.description,
            location: evt.location || 'Location unrecorded',
            memberId: m.id,
            memberName: name,
            themeColor: color,
          });
        });
      }
    });

    // Sort chronologically ascending
    list.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      // Sort births first if in the same year, then milestones, then deaths
      const priority = { birth: 1, milestone: 2, death: 3 };
      return priority[a.type] - priority[b.type];
    });

    return list;
  }, [members]);

  // Apply search query and filters
  const filteredEvents = useMemo(() => {
    let result = sortedEvents;

    if (selectedType !== 'all') {
      result = result.filter((e) => e.type === selectedType);
    }

    if (search.trim() !== '') {
      const q = search.toLowerCase();
      result = result.filter((e) => {
        return (
          e.title.toLowerCase().includes(q) ||
          e.memberName.toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q) ||
          e.year.toString().includes(q)
        );
      });
    }

    return result;
  }, [sortedEvents, selectedType, search]);

  return (
    <div className="space-y-6">
      {/* 1. Header Information */}
      <div className="bg-[#FAF9F6] p-6 rounded-xl border border-[#E5E1DA] flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#2D2926] flex items-center gap-2">
            <History className="w-5 h-5 text-[#2D2926]" /> Master Family Chronicle
          </h2>
          <p className="text-xs text-[#7A7570] mt-1">
            Explore a singular historic timeline of milestones, arrivals, and passings compiled from the entire family index.
          </p>
        </div>

        {/* Quick legend */}
        <div className="flex gap-2 text-[9px] font-bold font-mono tracking-wider">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-[#E5E1DA] text-[#7A7570] uppercase">
            Births
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-[#E5E1DA] text-[#7A7570] uppercase">
            Milestones
          </span>
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-[#E5E1DA] text-[#7A7570] uppercase">
            Passings
          </span>
        </div>
      </div>

      {/* 2. Control console */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E1DA] grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className="relative md:col-span-6">
          <Search className="w-4 h-4 text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search timeline by year, location, title, description or person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FAF9F6] border border-[#E5E1DA] text-[#2D2926] rounded-lg px-4 pl-9 py-2 text-xs focus:ring-1 focus:ring-[#2D2926] focus:border-[#2D2926] outline-hidden outline-none"
          />
        </div>

        {/* Filter event type */}
        <div className="md:col-span-4 flex rounded-lg overflow-hidden border border-[#E5E1DA] text-xs">
          {(['all', 'birth', 'milestone', 'death'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex-1 py-2 text-center font-bold uppercase text-[9px] tracking-wider border-r border-[#E5E1DA] last:border-r-0 cursor-pointer transition-colors duration-150 ${
                selectedType === type
                  ? 'bg-[#2D2926] text-white'
                  : 'bg-[#FAF9F6] text-[#7A7570] hover:bg-[#E5E1DA]/40'
              }`}
            >
              {type === 'all' ? 'All' : type === 'death' ? 'Passing' : type}
            </button>
          ))}
        </div>

        {/* Total found metric */}
        <div className="md:col-span-2 text-right text-xs font-mono font-bold text-[#A8A29E]">
          EVENTS: {filteredEvents.length}
        </div>
      </div>

      {/* 3. The Vertical Timeline Visual */}
      <div className="relative bg-white border border-[#E5E1DA] rounded-xl p-6 md:p-8 max-w-4xl mx-auto overflow-hidden">
        {filteredEvents.length > 0 ? (
          <div className="relative pl-6 md:pl-12 border-l border-[#E5E1DA] space-y-10 py-4 select-none">
            {filteredEvents.map((evt, idx) => {
              return (
                <div key={idx} className="relative group">
                  {/* Timeline bullet nodes with absolute offset */}
                  <span 
                    className="absolute -left-[31px] md:-left-[53px] top-1.5 w-3 h-3 rounded-full border border-[#2D2926] bg-white flex items-center justify-center transition-all duration-300 group-hover:scale-125"
                  >
                    <span 
                      className="w-1.5 h-1.5 rounded-full bg-[#2D2926]"
                    />
                  </span>

                  {/* Hover visual highlight link */}
                  <div className="absolute -left-3 rounded-full h-full bg-gradient-to-r from-stone-50 to-transparent scale-y-105 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  {/* Year Tag absolute or side margin layout */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 relative">
                    <div className="space-y-1 md:max-w-2xl">
                      {/* Event category chip & Year */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg text-[#2D2926] tracking-tight">
                          {evt.year}
                        </span>
                        
                        <span className="text-[8px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E5E1DA] text-[#7A7570]">
                          {evt.type === 'death' ? 'Passing' : evt.type}
                        </span>

                        <span className="text-[10px] text-[#A8A29E] font-mono font-medium">
                          &bull; {getEraLabel(`${evt.year}-01-01`).era}
                        </span>
                      </div>

                      {/* Event title */}
                      <h3 className="text-base font-serif font-bold text-[#2D2926] pt-1 group-hover:underline decoration-1 decoration-[#2D2926]">
                        {evt.title}
                      </h3>

                      {/* Description */}
                      {evt.description && (
                        <p className="text-xs text-[#7A7570] font-normal leading-relaxed text-left pt-0.5">
                          {evt.description}
                        </p>
                      )}

                      {/* Location bar */}
                      <div className="flex items-center gap-1 text-[11px] text-[#7A7570] pt-2 font-mono">
                        <MapPin className="w-3.5 h-3.5 text-[#A8A29E] shrink-0" />
                        <span>{evt.location}</span>
                      </div>
                    </div>

                    {/* Member Link Badge (Trigger relative jumps) */}
                    <div className="flex flex-col gap-1.5 items-end self-start shrink-0">
                      <button
                        onClick={() => onSelectMember(evt.memberId)}
                        className="py-1.5 px-3 rounded-lg border border-[#E5E1DA] bg-[#FAF9F6] hover:bg-white hover:border-[#2D2926] transition-all text-xs font-semibold text-[#2D2926] flex items-center gap-1.5 cursor-pointer max-w-[200px]"
                      >
                        <User className="w-3.5 h-3.5 text-[#A8A29E] shrink-0" />
                        <span className="truncate">{evt.memberName}</span>
                      </button>

                      <button
                        onClick={() => onViewTree(evt.memberId)}
                        className="text-[10px] font-mono text-[#2D2926] font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        View Tree <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center max-w-sm mx-auto">
            <History className="w-8 h-8 text-[#A8A29E] mx-auto mb-4" />
            <h4 className="font-serif font-bold text-[#2D2926] text-lg">No chronicled milestones match fields</h4>
            <p className="text-xs text-[#7A7570] mt-2 leading-relaxed">
              Refine your filters, reset event keywords, or log a milestone timeline event under member details!
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedType('all');
              }}
              className="mt-4 px-3.5 py-1.5 bg-[#2D2926] hover:bg-stone-800 text-white text-xs rounded-lg font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
