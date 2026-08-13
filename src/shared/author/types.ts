/**
 * Author attribution — single source of truth for feed / reels / cards.
 *
 * Media often ships avatar without firstName/lastName. Name resolution must
 * go through one pipeline: extract id → profile store → display fields.
 */

export type AuthorId = string;

export type AuthorProfile = {
  id: AuthorId;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar: string;
  email?: string;
};

/** Anything that might carry uploader/author fields (media item, raw API row). */
export type AuthorCarrier = {
  uploadedBy?: string | Record<string, any> | null;
  author?: string | Record<string, any> | null;
  authorInfo?: Record<string, any> | null;
  speaker?: string | null;
  speakerAvatar?: string | null;
  userAvatar?: string | null;
  uploadedByName?: string | null;
  authorName?: string | null;
  displayName?: string | null;
  creatorName?: string | null;
  [key: string]: any;
};

export const ANONYMOUS_AUTHOR_LABEL = "Anonymous User";
