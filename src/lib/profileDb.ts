/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';

function errMsg(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: string }).message);
    if (message.includes('Could not find the table') || message.includes('schema cache')) {
      return 'Collaboration tables are missing. Run supabase/migrations/20260531160000_fix_collaboration.sql in your Supabase project.';
    }
    return message;
  }
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

export function isCollaborationSchemaError(error: unknown): boolean {
  const msg = errMsg(error);
  return msg.includes('schema cache') || msg.includes('Could not find the table');
}

export async function loadUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, display_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(errMsg(error));

  return {
    id: userId,
    firstName: data?.first_name ?? '',
    lastName: data?.last_name ?? '',
    displayName: data?.display_name ?? null,
  };
}

export async function updateUserProfileNames(
  userId: string,
  firstName: string,
  lastName: string
): Promise<void> {
  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  const displayName = `${trimmedFirst} ${trimmedLast}`.trim();

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: trimmedFirst,
      last_name: trimmedLast,
      display_name: displayName || null,
    })
    .eq('id', userId);

  if (error) throw new Error(errMsg(error));
}

export function profileNeedsNames(profile: { firstName: string; lastName: string }): boolean {
  return !profile.firstName.trim() || !profile.lastName.trim();
}
