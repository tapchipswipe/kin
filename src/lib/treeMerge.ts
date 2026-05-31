/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AccessibleTree,
  CollaborationRole,
  FamilyMember,
  MemberLink,
  MergedMemberSource,
  VirtualMember,
} from '../types';
import { normalizeFamilyMember } from './importFamilyJson';

function compositeKey(treeId: string, memberId: string): string {
  return `${treeId}::${memberId}`;
}

class UnionFind {
  private parent = new Map<string, string>();

  find(key: string): string {
    if (!this.parent.has(key)) this.parent.set(key, key);
    let root = key;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    let node = key;
    while (node !== root) {
      const next = this.parent.get(node)!;
      this.parent.set(node, root);
      node = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

function mergeMemberFields(primary: FamilyMember, secondary: FamilyMember): FamilyMember {
  const pick = <K extends keyof FamilyMember>(key: K): FamilyMember[K] => {
    const a = primary[key];
    const b = secondary[key];
    if (Array.isArray(a) && Array.isArray(b)) {
      const combined = [...a];
      for (const item of b) {
        const id = (item as { id?: string }).id;
        if (id && combined.some((x) => (x as { id?: string }).id === id)) continue;
        combined.push(item);
      }
      return combined as FamilyMember[K];
    }
    if (a !== undefined && a !== null && a !== '') return a;
    return b;
  };

  return {
    ...secondary,
    ...primary,
    firstName: primary.firstName || secondary.firstName,
    lastName: primary.lastName || secondary.lastName,
    maidenName: pick('maidenName'),
    birthDate: pick('birthDate'),
    birthPlace: pick('birthPlace'),
    deathDate: pick('deathDate'),
    deathPlace: pick('deathPlace'),
    biography: pick('biography'),
    occupation: pick('occupation'),
    avatarUrl: pick('avatarUrl'),
    spouseIds: [...new Set([...(primary.spouseIds || []), ...(secondary.spouseIds || [])])],
    childrenIds: [...new Set([...(primary.childrenIds || []), ...(secondary.childrenIds || [])])],
    events: pick('events') as FamilyMember['events'],
    media: pick('media') as FamilyMember['media'],
  };
}

function roleCanEdit(role: CollaborationRole | 'owner'): boolean {
  return role === 'owner' || role === 'editor';
}

export interface MergeInput {
  trees: AccessibleTree[];
  links: MemberLink[];
  anchorTreeId: string;
  anchorMemberId: string | null;
  userId: string;
}

export interface MergeResult {
  virtualMembers: VirtualMember[];
  /** Map composite source key → virtual member id */
  sourceToVirtual: Map<string, string>;
  conflicts: { virtualId: string; field: string; values: { treeName: string; value: string }[] }[];
}

export function mergeTrees(input: MergeInput): MergeResult {
  const trees = input.trees.map((tree) => ({
    ...tree,
    members: tree.members.map((member, index) => normalizeFamilyMember(member, index)),
  }));
  const { links, anchorTreeId, anchorMemberId, userId } = input;
  const acceptedLinks = links.filter((l) => l.status === 'accepted');
  const uf = new UnionFind();

  type RawEntry = {
    tree: AccessibleTree;
    member: FamilyMember;
    key: string;
  };

  const rawEntries: RawEntry[] = [];
  for (const tree of trees) {
    for (const member of tree.members) {
      const key = compositeKey(tree.treeId, member.id);
      rawEntries.push({ tree, member, key });
      uf.find(key);
    }
  }

  for (const link of acceptedLinks) {
    uf.union(compositeKey(link.treeAId, link.memberAId), compositeKey(link.treeBId, link.memberBId));
  }

  const groups = new Map<string, RawEntry[]>();
  for (const entry of rawEntries) {
    const root = uf.find(entry.key);
    const list = groups.get(root) ?? [];
    list.push(entry);
    groups.set(root, list);
  }

  const sourceToVirtual = new Map<string, string>();
  const virtualMembers: VirtualMember[] = [];
  const conflicts: MergeResult['conflicts'] = [];

  let virtualCounter = 0;

  for (const [, entries] of groups) {
    const virtualId = `v_${virtualCounter++}`;
    let merged = { ...entries[0].member };
    const sources: MergedMemberSource[] = [];

    for (const { tree, member, key } of entries) {
      sources.push({
        treeId: tree.treeId,
        treeName: tree.isOwnTree ? 'My tree' : tree.ownerName,
        memberId: member.id,
        role: tree.role,
      });
      sourceToVirtual.set(key, virtualId);
      if (member.id !== merged.id) {
        merged = mergeMemberFields(merged, member);
      }
    }

    const fieldChecks: (keyof FamilyMember)[] = [
      'birthDate',
      'birthPlace',
      'deathDate',
      'biography',
      'occupation',
    ];
    for (const field of fieldChecks) {
      const values = new Map<string, string>();
      for (const { tree, member } of entries) {
        const val = member[field];
        if (val && typeof val === 'string' && val.trim()) {
          const label = tree.isOwnTree ? 'My tree' : tree.ownerName;
          values.set(label, val);
        }
      }
      const unique = [...values.entries()];
      if (unique.length > 1) {
        const distinct = new Set(unique.map(([, v]) => v));
        if (distinct.size > 1) {
          conflicts.push({
            virtualId,
            field,
            values: unique.map(([treeName, value]) => ({ treeName, value })),
          });
        }
      }
    }

    const isEditable = sources.some(
      (s) => s.treeId === anchorTreeId && roleCanEdit(s.role)
    ) || sources.some(
      (s) => trees.find((t) => t.treeId === s.treeId)?.ownerId === userId && roleCanEdit(s.role)
    );

    virtualMembers.push({
      ...merged,
      id: virtualId,
      virtualId,
      sources,
      isEditable,
    });
  }

  const virtualById = new Map(virtualMembers.map((v) => [v.virtualId, v]));

  const remapId = (treeId: string, memberId: string | null | undefined): string | null => {
    if (!memberId) return null;
    const key = compositeKey(treeId, memberId);
    return sourceToVirtual.get(key) ?? null;
  };

  for (const vm of virtualMembers) {
    const sourceKeys = vm.sources.map((s) => compositeKey(s.treeId, s.memberId));
    const relatedSpouses = new Set<string>();
    const relatedChildren = new Set<string>();
    let father: string | null = null;
    let mother: string | null = null;

    for (const src of vm.sources) {
      const orig = trees
        .find((t) => t.treeId === src.treeId)
        ?.members.find((m) => m.id === src.memberId);
      if (!orig) continue;

      const f = remapId(src.treeId, orig.fatherId);
      const mo = remapId(src.treeId, orig.motherId);
      if (f && !father) father = f;
      if (mo && !mother) mother = mo;

      for (const sid of orig.spouseIds || []) {
        const mapped = remapId(src.treeId, sid);
        if (mapped && mapped !== vm.virtualId) relatedSpouses.add(mapped);
      }
      for (const cid of orig.childrenIds || []) {
        const mapped = remapId(src.treeId, cid);
        if (mapped && mapped !== vm.virtualId) relatedChildren.add(mapped);
      }
    }

    vm.fatherId = father;
    vm.motherId = mother;
    vm.spouseIds = [...relatedSpouses];
    vm.childrenIds = [...relatedChildren];

    if (anchorMemberId) {
      const isAnchor = vm.sources.some(
        (s) => s.treeId === anchorTreeId && s.memberId === anchorMemberId
      );
      if (isAnchor) vm.isAnchor = true;
    }
  }

  // Sync reciprocal spouse/child links within virtual graph
  for (const vm of virtualMembers) {
    for (const spouseId of vm.spouseIds ?? []) {
      const spouse = virtualById.get(spouseId);
      if (!spouse) continue;
      if (!spouse.spouseIds) spouse.spouseIds = [];
      if (!spouse.spouseIds.includes(vm.virtualId)) {
        spouse.spouseIds.push(vm.virtualId);
      }
    }
    for (const childId of vm.childrenIds ?? []) {
      const child = virtualById.get(childId);
      if (!child) continue;
      const srcMember = vm.sources[0];
      if (!srcMember) continue;
      const orig = trees
        .find((t) => t.treeId === srcMember.treeId)
        ?.members.find((m) => m.id === srcMember.memberId);
      if (orig?.gender === 'male' && child.fatherId !== vm.virtualId) {
        child.fatherId = vm.virtualId;
      } else if (orig?.gender === 'female' && child.motherId !== vm.virtualId) {
        child.motherId = vm.virtualId;
      }
    }
  }

  return { virtualMembers, sourceToVirtual, conflicts };
}

/** Convert virtual members to FamilyMember[] for TreeCanvas display. */
export function virtualMembersForCanvas(virtualMembers: VirtualMember[]): FamilyMember[] {
  return virtualMembers.map(({ virtualId, sources, isEditable, ...member }) => ({
    ...member,
    id: virtualId,
  }));
}

export function sourceBadgeForMember(vm: VirtualMember): string {
  if (vm.sources.length === 1) {
    return vm.sources[0].treeName;
  }
  return vm.sources.map((s) => s.treeName).join(' + ');
}
