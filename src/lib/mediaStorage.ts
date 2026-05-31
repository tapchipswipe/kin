/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';

export async function uploadMediaFile(
  userId: string,
  treeId: string,
  file: File,
  mediaId: string
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${userId}/${treeId}/${mediaId}.${ext}`;

  const { error } = await supabase.storage.from('media').upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) throw error;

  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadDataUrl(
  userId: string,
  treeId: string,
  dataUrl: string,
  mediaId: string,
  mimeType: string
): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], `${mediaId}.${mimeType.split('/')[1] ?? 'bin'}`, {
    type: mimeType,
  });
  return uploadMediaFile(userId, treeId, file, mediaId);
}

export async function deleteMediaFile(url: string): Promise<void> {
  const marker = '/storage/v1/object/public/media/';
  const idx = url.indexOf(marker);
  if (idx === -1) return;

  const path = url.slice(idx + marker.length);
  const { error } = await supabase.storage.from('media').remove([path]);
  if (error) console.warn('Failed to delete media file:', error);
}

export function isStorageUrl(url: string): boolean {
  return url.includes('/storage/v1/object/public/media/');
}

export function isDataUrl(url: string): boolean {
  return url.startsWith('data:');
}
