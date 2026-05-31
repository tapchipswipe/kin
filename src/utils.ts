/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FamilyMember } from './types';

/**
 * Perform a clean bilateral link for a new relationship
 */
export function addRelationshipBidirectional(
  members: FamilyMember[],
  memberId: string,
  targetId: string,
  type: 'father' | 'mother' | 'spouse' | 'child'
): FamilyMember[] {
  return members.map((m) => {
    // 1. Update the primary member
    if (m.id === memberId) {
      const updated = { ...m };
      if (type === 'father') {
        updated.fatherId = targetId;
      } else if (type === 'mother') {
        updated.motherId = targetId;
      } else if (type === 'spouse') {
        if (!updated.spouseIds.includes(targetId)) {
          updated.spouseIds = [...updated.spouseIds, targetId];
        }
      } else if (type === 'child') {
        if (!updated.childrenIds.includes(targetId)) {
          updated.childrenIds = [...updated.childrenIds, targetId];
        }
      }
      return updated;
    }

    // 2. Update the target member (bilateral link)
    if (m.id === targetId) {
      const updated = { ...m };
      if (type === 'father' || type === 'mother') {
        // The target is the parent, so the primary member is the child
        if (!updated.childrenIds.includes(memberId)) {
          updated.childrenIds = [...updated.childrenIds, memberId];
        }
      } else if (type === 'spouse') {
        // Spouses are mutually linked
        if (!updated.spouseIds.includes(memberId)) {
          updated.spouseIds = [...updated.spouseIds, memberId];
        }
      } else if (type === 'child') {
        // The target is the child, so the primary member is the parent.
        // We set fatherId or motherId on the child based on primary member's gender.
        const parent = members.find((p) => p.id === memberId);
        if (parent) {
          if (parent.gender === 'male') {
            updated.fatherId = memberId;
          } else if (parent.gender === 'female') {
            updated.motherId = memberId;
          } else {
            // fallback if other
            if (!updated.fatherId) updated.fatherId = memberId;
            else if (!updated.motherId) updated.motherId = memberId;
          }
        }
      }
      return updated;
    }

    return m;
  });
}

/**
 * Remove a member completely and cleanly disconnect all mutual references
 */
export function removeMemberCleanly(members: FamilyMember[], targetId: string): FamilyMember[] {
  // 1. Filter out the deleted user
  const remainder = members.filter((m) => m.id !== targetId);

  // 2. Erase any pointers to targetId on other members
  return remainder.map((m) => {
    const updated = { ...m };
    
    // clear parent pointers
    if (updated.fatherId === targetId) {
      updated.fatherId = null;
    }
    if (updated.motherId === targetId) {
      updated.motherId = null;
    }

    // clear spouse pointers
    if (updated.spouseIds.includes(targetId)) {
      updated.spouseIds = updated.spouseIds.filter((id) => id !== targetId);
    }

    // clear children pointers
    if (updated.childrenIds.includes(targetId)) {
      updated.childrenIds = updated.childrenIds.filter((id) => id !== targetId);
    }

    return updated;
  });
}

/**
 * Estimate Generation Index (Levels BFS) starting from "Founders"
 * Founders = members who have no father and no mother in the current list.
 */
export function computeGenerations(members: FamilyMember[]): { [id: string]: number } {
  const genMap: { [id: string]: number } = {};
  if (members.length === 0) return genMap;

  // Find founders (no parent nodes)
  const founders = members.filter((m) => !m.fatherId && !m.motherId);
  const queue: string[] = [];

  // Initialize founders to Gen 1
  founders.forEach((f) => {
    genMap[f.id] = 1;
    queue.push(f.id);
  });

  // If there are cycles, fallback: pick members with lowest birth year to kick off
  if (founders.length === 0) {
    const sortedByAge = [...members].sort((a, b) => {
      const yearA = parseInt(a.birthDate?.slice(0, 4) || '2100');
      const yearB = parseInt(b.birthDate?.slice(0, 4) || '2100');
      return yearA - yearB;
    });
    if (sortedByAge[0]) {
      genMap[sortedByAge[0].id] = 1;
      queue.push(sortedByAge[0].id);
    }
  }

  // BFS traversal to calculate generation ranks safely
  let index = 0;
  while (index < queue.length) {
    const currentId = queue[index++];
    const currentLvl = genMap[currentId] || 1;

    const currentMember = members.find((m) => m.id === currentId);
    if (!currentMember) continue;

    // Children are evaluated as currentLvl + 1
    currentMember.childrenIds.forEach((childId) => {
      // Avoid infinite loop cycles
      if (!(childId in genMap)) {
        genMap[childId] = currentLvl + 1;
        queue.push(childId);
      } else {
        // Keep the higher generation levels for multi-path descendants
        genMap[childId] = Math.max(genMap[childId], currentLvl + 1);
      }
    });

    // In case spouse levels are different, equalize if needed (or keep separate)
    currentMember.spouseIds.forEach((spouseId) => {
      if (!(spouseId in genMap)) {
        genMap[spouseId] = currentLvl;
        queue.push(spouseId);
      }
    });
  }

  // Fill in any missed ones (floating nodes with no connected links) as Gen 1
  members.forEach((m) => {
    if (!(m.id in genMap)) {
      genMap[m.id] = 1;
    }
  });

  return genMap;
}

/**
 * Groups members by decade/era of birth
 */
export function getEraLabel(birthDate?: string): { era: string; description: string } {
  if (!birthDate) return { era: 'Unknown Era', description: 'No date recorded' };
  const year = parseInt(birthDate.slice(0, 4));
  if (isNaN(year)) return { era: 'Unknown Era', description: 'No date recorded' };

  if (year < 1910) return { era: 'Pioneer Generation', description: 'Born before 1910' };
  if (year < 1940) return { era: 'World War Generation', description: 'Born between 1910 and 1939' };
  if (year < 1965) return { era: 'Baby Boomer Generation', description: 'Born between 1940 and 1964' };
  if (year < 1985) return { era: 'Generation X', description: 'Born between 1965 and 1984' };
  if (year < 2005) return { era: 'Millennial Generation', description: 'Born between 1985 and 2004' };
  return { era: 'New Century Generation', description: 'Born 2005 or later' };
}

/**
 * Gets direct siblings by looking at shared parents
 */
export function findSiblings(members: FamilyMember[], member: FamilyMember): FamilyMember[] {
  if (!member.fatherId && !member.motherId) return [];
  return members.filter((m) => {
    if (m.id === member.id) return false;
    const sameFather = member.fatherId && m.fatherId === member.fatherId;
    const sameMother = member.motherId && m.motherId === member.motherId;
    return sameFather || sameMother;
  });
}
