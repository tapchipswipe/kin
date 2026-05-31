/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FamilyMember, MediaAttachment, TimelineEvent } from '../types';

export const IMPORTED_TREE_PREFIX = 'import:';

export function isImportedTreeId(treeId: string): boolean {
  return treeId.startsWith(IMPORTED_TREE_PREFIX);
}

export function newImportedTreeId(): string {
  return `${IMPORTED_TREE_PREFIX}${crypto.randomUUID()}`;
}

function asMemberArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.members)) return obj.members;
    if (Array.isArray(obj.data)) return obj.data;
    if (typeof obj.id === 'string') return [obj];
  }
  return null;
}

/** Parse exported family JSON (array or { members: [...] } wrapper). */
export function parseFamilyJsonExport(text: string): FamilyMember[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('Could not parse JSON. Make sure this is a Kith & Kin export file.');
  }

  const list = asMemberArray(raw);
  if (!list || list.length === 0) {
    throw new Error('No family members found in this file.');
  }

  return normalizeFamilyMembers(list);
}

/** Ensure imported records have required fields so UI never crashes. */
export function normalizeFamilyMembers(list: unknown[]): FamilyMember[] {
  return list.map((entry, index) => normalizeFamilyMember(entry, index));
}

function textField(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function memberId(value: unknown, index: number): string {
  const id = textField(value);
  return id || `m_import_${Date.now()}_${index}`;
}

export function normalizeFamilyMember(entry: unknown, index = 0): FamilyMember {
  const m = (entry && typeof entry === 'object' ? entry : {}) as Partial<FamilyMember> & {
    timelineEvents?: TimelineEvent[];
    mediaAttachments?: MediaAttachment[];
  };

  const events = m.events ?? m.timelineEvents ?? [];
  const media = m.media ?? m.mediaAttachments ?? [];

  return {
    id: memberId(m.id, index),
    firstName: textField(m.firstName) || 'Unknown',
    lastName: textField(m.lastName),
    maidenName: m.maidenName,
    gender:
      m.gender === 'male' || m.gender === 'female' || m.gender === 'other' ? m.gender : 'other',
    birthDate: m.birthDate,
    birthPlace: m.birthPlace,
    deathDate: m.deathDate,
    deathPlace: m.deathPlace,
    isDeceased: Boolean(m.isDeceased),
    biography: m.biography,
    avatarUrl: m.avatarUrl,
    occupation: m.occupation,
    heritageSide: m.heritageSide,
    heritageLabel: m.heritageLabel,
    isAnchor: m.isAnchor,
    fatherId: m.fatherId ?? null,
    motherId: m.motherId ?? null,
    spouseIds: [...(m.spouseIds ?? [])],
    childrenIds: [...(m.childrenIds ?? [])],
    events: Array.isArray(events) ? [...events] : [],
    media: Array.isArray(media) ? [...media] : [],
  };
}
