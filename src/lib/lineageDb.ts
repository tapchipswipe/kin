/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FamilyMember } from '../types';
import { supabase } from './supabase';

export type TreeLayout = 'hierarchical' | 'radial' | 'grid';

export interface LineageData {
  treeId: string;
  members: FamilyMember[];
  recentlyVisited: string[];
  blueprintLayout: TreeLayout;
  geocodeCache: Record<string, { lat: number; lng: number }>;
}

export async function loadLineageData(userId: string): Promise<LineageData> {
  const { data: tree, error: treeError } = await supabase
    .from('trees')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (treeError) throw treeError;

  let treeId = tree?.id;

  if (!treeId) {
    const { data: newTree, error: createError } = await supabase
      .from('trees')
      .insert({ owner_id: userId })
      .select('id')
      .single();

    if (createError) throw createError;
    treeId = newTree.id;
  }

  const [membersResult, prefsResult] = await Promise.all([
    supabase.from('members').select('id, data').eq('tree_id', treeId),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (prefsResult.error) throw prefsResult.error;

  const members = (membersResult.data ?? []).map(
    (row) => row.data as FamilyMember
  );

  let prefs = prefsResult.data;
  if (!prefs) {
    const { data: newPrefs, error: prefsCreateError } = await supabase
      .from('user_preferences')
      .insert({ user_id: userId })
      .select('*')
      .single();

    if (prefsCreateError) throw prefsCreateError;
    prefs = newPrefs;
  }

  const layout = prefs.blueprint_layout as TreeLayout;
  const validLayouts: TreeLayout[] = ['hierarchical', 'radial', 'grid'];

  return {
    treeId,
    members,
    recentlyVisited: prefs.recently_visited ?? [],
    blueprintLayout: validLayouts.includes(layout) ? layout : 'hierarchical',
    geocodeCache: (prefs.geocode_cache as Record<string, { lat: number; lng: number }>) ?? {},
  };
}

export async function saveMembers(treeId: string, members: FamilyMember[]): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('members')
    .select('id')
    .eq('tree_id', treeId);

  if (fetchError) throw fetchError;

  const existingIds = new Set((existing ?? []).map((r) => r.id));
  const currentIds = new Set(members.map((m) => m.id));

  const toDelete = [...existingIds].filter((id) => !currentIds.has(id));
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('members')
      .delete()
      .eq('tree_id', treeId)
      .in('id', toDelete);

    if (deleteError) throw deleteError;
  }

  if (members.length === 0) return;

  const rows = members.map((m) => ({
    tree_id: treeId,
    id: m.id,
    data: m,
  }));

  const { error: upsertError } = await supabase
    .from('members')
    .upsert(rows, { onConflict: 'tree_id,id' });

  if (upsertError) throw upsertError;

  await supabase
    .from('trees')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', treeId);
}

export async function savePreferences(
  userId: string,
  prefs: {
    recentlyVisited?: string[];
    blueprintLayout?: TreeLayout;
    geocodeCache?: Record<string, { lat: number; lng: number }>;
  }
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (prefs.recentlyVisited !== undefined) {
    update.recently_visited = prefs.recentlyVisited;
  }
  if (prefs.blueprintLayout !== undefined) {
    update.blueprint_layout = prefs.blueprintLayout;
  }
  if (prefs.geocodeCache !== undefined) {
    update.geocode_cache = prefs.geocodeCache;
  }

  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: userId, ...update }, { onConflict: 'user_id' });

  if (error) throw error;
}

export async function clearAllMembers(treeId: string): Promise<void> {
  const { error } = await supabase.from('members').delete().eq('tree_id', treeId);
  if (error) throw error;
}
