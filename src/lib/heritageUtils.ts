/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FamilyMember, HeritageSide } from '../types';

export type HeritageFilter = 'all' | 'maternal' | 'paternal';

/** Collect all ancestor IDs tracing upward from a root member. */
function collectAncestors(
  rootId: string | null | undefined,
  members: FamilyMember[]
): Set<string> {
  const set = new Set<string>();
  if (!rootId) return set;

  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    if (set.has(id)) continue;
    set.add(id);
    const m = members.find((x) => x.id === id);
    if (!m) continue;
    if (m.fatherId) queue.push(m.fatherId);
    if (m.motherId) queue.push(m.motherId);
  }
  return set;
}

/** Build a map of member ID → heritage side relative to the anchor. */
export function buildHeritageMap(
  members: FamilyMember[],
  anchorId: string | null
): Map<string, HeritageSide> {
  const map = new Map<string, HeritageSide>();
  if (!anchorId) return map;

  const anchor = members.find((m) => m.id === anchorId);
  if (!anchor) return map;

  map.set(anchorId, 'neutral');

  const maternalIds = collectAncestors(anchor.motherId, members);
  const paternalIds = collectAncestors(anchor.fatherId, members);

  if (anchor.motherId) {
    map.set(anchor.motherId, 'maternal');
  }
  if (anchor.fatherId) {
    map.set(anchor.fatherId, 'paternal');
  }

  for (const id of maternalIds) {
    const m = members.find((x) => x.id === id);
    map.set(id, m?.heritageSide === 'paternal' ? 'paternal' : 'maternal');
  }
  for (const id of paternalIds) {
    const m = members.find((x) => x.id === id);
    map.set(id, m?.heritageSide === 'maternal' ? 'maternal' : 'paternal');
  }

  for (const m of members) {
    if (m.heritageSide && m.heritageSide !== 'neutral') {
      map.set(m.id, m.heritageSide);
    }
  }

  return map;
}

export function getMemberHeritageSide(
  memberId: string,
  heritageMap: Map<string, HeritageSide>
): HeritageSide {
  return heritageMap.get(memberId) ?? 'neutral';
}

export function memberMatchesHeritageFilter(
  memberId: string,
  filter: HeritageFilter,
  heritageMap: Map<string, HeritageSide>
): boolean {
  if (filter === 'all') return true;
  return getMemberHeritageSide(memberId, heritageMap) === filter;
}

export function filterMembersByHeritage(
  members: FamilyMember[],
  filter: HeritageFilter,
  anchorId: string | null
): FamilyMember[] {
  if (filter === 'all' || !anchorId) return members;
  const map = buildHeritageMap(members, anchorId);
  return members.filter((m) => memberMatchesHeritageFilter(m.id, filter, map));
}

export const HERITAGE_COLORS: Record<HeritageSide, { border: string; bg: string; text: string }> = {
  maternal: { border: 'border-rose-300', bg: 'bg-rose-50', text: 'text-rose-800' },
  paternal: { border: 'border-sky-300', bg: 'bg-sky-50', text: 'text-sky-800' },
  neutral: { border: 'border-[#E5E1DA]', bg: 'bg-white', text: 'text-[#2D2926]' },
};
