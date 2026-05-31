/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  description?: string;
  location?: string;
}

export interface MediaAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'audio' | 'video';
  url: string; // Base64 data URL
  uploadedAt: string;
  size?: string;
  notes?: string;
  associatedEventId?: string; // Reference to a TimelineEvent id if associated with an event
}

export interface ProposedSuggestion {
  id: string;
  type: 'add_member' | 'edit_member' | 'add_event' | 'add_media';
  status: 'pending' | 'approved' | 'rejected';
  author: string;
  timestamp: string;
  memberId?: string; // target member ID for edits/additions
  description: string; // descriptive overview of proposed change
  suggestedData: {
    member?: Partial<FamilyMember>;
    event?: TimelineEvent;
    media?: MediaAttachment;
  };
}

export interface CollaborationSession {
  currentUser: string; // 'Owner' or name of guest (e.g. 'Cousin Sarah')
  role: 'owner' | 'editor' | 'guest_contributor'; // guest_contributor can only suggest changes
  allowedBranchId?: string; // Specific branch root member ID, rest inherits view-only or no access
}

export type HeritageSide = 'maternal' | 'paternal' | 'neutral';

export interface FamilyMember {
  id: string;
  firstName: string;
  lastName: string;
  maidenName?: string;
  gender: 'male' | 'female' | 'other';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  isDeceased: boolean;
  biography?: string;
  avatarUrl?: string; // Hex color or emoji/image identifier
  occupation?: string;

  /** Which heritage line this member belongs to (maternal / paternal side) */
  heritageSide?: HeritageSide;
  /** Custom label e.g. "Puerto Rican side", "Familia materna" */
  heritageLabel?: string;
  /** True when this member is the tree anchor (the "you" at the junction) */
  isAnchor?: boolean;
  
  // Direct relationship pointers
  fatherId?: string | null;
  motherId?: string | null;
  spouseIds: string[];
  childrenIds: string[];
  
  // Custom milestones
  events: TimelineEvent[];

  // Media Gallery Archive Attachments
  media?: MediaAttachment[];
}
