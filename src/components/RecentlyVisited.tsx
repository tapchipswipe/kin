/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FamilyMember } from '../types';
import { History, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RecentlyVisitedProps {
  memberIds: string[];
  members: FamilyMember[];
  focusId: string;
  onSelectMember: (id: string) => void;
}

export const RecentlyVisited: React.FC<RecentlyVisitedProps> = ({
  memberIds,
  members,
  focusId,
  onSelectMember,
}) => {
  // Resolve member objects from IDs
  const visitedMembers = memberIds
    .map(id => members.find(m => m.id === id))
    .filter((m): m is FamilyMember => !!m);

  if (visitedMembers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-[#E5E1DA] rounded-xl overflow-hidden p-4 space-y-3 shadow-xs text-left"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-[#E5E1DA]">
        <History className="w-3.5 h-3.5 text-[#7A7570]" />
        <h4 className="text-[10px] font-bold text-[#7A7570] uppercase tracking-wider font-mono">
          Recently Viewed Profile Log ({visitedMembers.length})
        </h4>
      </div>

      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {visitedMembers.map((member, index) => {
            const isCurrentlyFocused = member.id === focusId;
            const birthYear = member.birthDate ? member.birthDate.slice(0, 4) : '????';
            const deathYear = member.isDeceased 
              ? (member.deathDate ? member.deathDate.slice(0, 4) : 'Deceased') 
              : 'Present';

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                whileHover={{ 
                  x: 3, 
                  backgroundColor: 'rgba(250, 249, 246, 0.9)',
                  borderColor: isCurrentlyFocused ? '#2D2926' : '#7A7570' 
                }}
                onClick={() => onSelectMember(member.id)}
                className={`flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-all ${
                  isCurrentlyFocused
                    ? 'bg-[#FAF9F6] border-[#2D2926] ring-1 ring-[#2D2926]/20'
                    : 'bg-white border-[#E5E1DA]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Miniature Avatar */}
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center font-serif text-[11px] font-bold text-white shrink-0 select-none pb-0.5"
                    style={{ backgroundColor: member.avatarUrl || '#2D2926' }}
                  >
                    {member.firstName[0]}
                  </span>

                  <div className="min-w-0">
                    <span className={`text-xs block truncate ${
                      isCurrentlyFocused ? 'font-bold text-[#2D2926]' : 'font-medium text-[#7A7570] hover:text-[#2D2926]'
                    }`}>
                      {member.firstName} {member.lastName}
                    </span>
                    <span className="text-[9px] font-mono text-[#A8A29E] leading-none block mt-0.5">
                      {birthYear} – {deathYear}
                    </span>
                  </div>
                </div>

                <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${
                  isCurrentlyFocused ? 'text-[#2D2926] font-bold' : 'text-[#A8A29E]'
                }`} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
