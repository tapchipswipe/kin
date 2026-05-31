/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FamilyMember } from '../types';

/** Export members as a JSON file download. */
export function downloadFamilyJson(members: FamilyMember[], filename = 'family_lineage.json'): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(members, null, 2)
  )}`;
  const anchor = document.createElement('a');
  anchor.setAttribute('href', jsonString);
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/** Share branch via Web Share API or fall back to download + mailto. */
export async function shareBranchWithFamily(
  members: FamilyMember[],
  userEmail?: string | null
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const json = JSON.stringify(members, null, 2);
  const filename = 'my_family_branch.json';
  const shareText =
    'Here is my side of the family tree from Kith & Kin. Please import this file into your family archive.';

  if (navigator.share && navigator.canShare?.({ files: [] })) {
    try {
      const file = new File([json], filename, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My family branch',
          text: shareText,
          files: [file],
        });
        return 'shared';
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    }
  }

  downloadFamilyJson(members, filename);

  const subject = encodeURIComponent('My family branch for our tree');
  const body = encodeURIComponent(
    `${shareText}\n\n(I attached the file by downloading it — please attach ${filename} to your reply, or use Import in Kith & Kin.)`
  );
  const mailto = userEmail
    ? `mailto:?subject=${subject}&body=${body}`
    : `mailto:?subject=${subject}&body=${body}`;
  window.location.href = mailto;
  return 'downloaded';
}
