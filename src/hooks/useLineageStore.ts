/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FamilyMember } from '../types';
import {
  loadLineageData,
  saveMembers,
  savePreferences,
  clearAllMembers,
  TreeLayout,
} from '../lib/lineageDb';

export type SaveStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

export function useLineageStore(userId: string | undefined) {
  const [treeId, setTreeId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [focusId, setFocusId] = useState('');
  const [recentlyVisited, setRecentlyVisited] = useState<string[]>([]);
  const [blueprintLayout, setBlueprintLayout] = useState<TreeLayout>('hierarchical');
  const [geocodeCache, setGeocodeCache] = useState<Record<string, { lat: number; lng: number }>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);

  const membersSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipMembersSave = useRef(true);
  const skipPrefsSave = useRef(true);

  useEffect(() => {
    if (!userId) {
      setTreeId(null);
      setMembers([]);
      setFocusId('');
      setRecentlyVisited([]);
      setBlueprintLayout('hierarchical');
      setGeocodeCache({});
      setSaveStatus('idle');
      return;
    }

    let cancelled = false;
    setSaveStatus('loading');
    setLoadError(null);

    loadLineageData(userId)
      .then((data) => {
        if (cancelled) return;
        setTreeId(data.treeId);
        setMembers(data.members);
        setFocusId(data.members[0]?.id ?? '');
        setRecentlyVisited(data.recentlyVisited);
        setBlueprintLayout(data.blueprintLayout);
        setGeocodeCache(data.geocodeCache);
        setSaveStatus('saved');
        skipMembersSave.current = true;
        skipPrefsSave.current = true;
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load lineage data:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load data');
        setSaveStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!treeId || skipMembersSave.current) {
      skipMembersSave.current = false;
      return;
    }

    if (membersSaveTimer.current) clearTimeout(membersSaveTimer.current);
    setSaveStatus('saving');

    membersSaveTimer.current = setTimeout(async () => {
      try {
        await saveMembers(treeId, members);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save members:', err);
        setSaveStatus('error');
      }
    }, 400);

    return () => {
      if (membersSaveTimer.current) clearTimeout(membersSaveTimer.current);
    };
  }, [members, treeId]);

  const schedulePrefsSave = useCallback(
    (prefs: {
      recentlyVisited?: string[];
      blueprintLayout?: TreeLayout;
      geocodeCache?: Record<string, { lat: number; lng: number }>;
    }) => {
      if (!userId || skipPrefsSave.current) {
        skipPrefsSave.current = false;
        return;
      }

      if (prefsSaveTimer.current) clearTimeout(prefsSaveTimer.current);

      prefsSaveTimer.current = setTimeout(async () => {
        try {
          await savePreferences(userId, prefs);
        } catch (err) {
          console.error('Failed to save preferences:', err);
        }
      }, 400);
    },
    [userId]
  );

  const updateRecentlyVisited = useCallback(
    (ids: string[]) => {
      setRecentlyVisited(ids);
      schedulePrefsSave({ recentlyVisited: ids });
    },
    [schedulePrefsSave]
  );

  const updateBlueprintLayout = useCallback(
    (layout: TreeLayout) => {
      setBlueprintLayout(layout);
      schedulePrefsSave({ blueprintLayout: layout });
    },
    [schedulePrefsSave]
  );

  const updateGeocodeCache = useCallback(
    (cache: Record<string, { lat: number; lng: number }>) => {
      setGeocodeCache(cache);
      schedulePrefsSave({ geocodeCache: cache });
    },
    [schedulePrefsSave]
  );

  const clearTree = useCallback(async () => {
    if (!treeId) return;
    await clearAllMembers(treeId);
    setMembers([]);
    setFocusId('');
  }, [treeId]);

  return {
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
    saveStatus,
    loadError,
    clearTree,
  };
}
