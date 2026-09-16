/**
 * Who may see content that hasn't been approved.
 *
 * Rule: unapproved media is visible only to the person who uploaded it, so they
 * can see it landed and delete it if they want. Everyone else sees nothing.
 *
 * Written as "not approved" rather than "equals under_review" on purpose — the
 * API also emits `pending` (undocumented in our types) and omits the field
 * entirely on some paths, and both of those must count as unapproved rather
 * than sailing through a `=== "under_review"` check.
 */

import { extractAuthorId } from "../author/extractAuthorId";

type Uploader =
  | string
  | { _id?: string; id?: string }
  | null
  | undefined;

export type ModeratableItem = {
  moderationStatus?: string | null;
  uploadedBy?: Uploader;
  userId?: string | null;
  createdBy?: Uploader;
  ownerId?: string | null;
  owner?: Uploader;
  author?: { _id?: string } | null;
  authorInfo?: { _id?: string } | null;
} | null | undefined;

export function normalizeModerationStatus(
  value?: string | null
): string {
  return String(value || "").trim().toLowerCase();
}

export function isApproved(item: ModeratableItem): boolean {
  return normalizeModerationStatus(item?.moderationStatus) === "approved";
}

export function isRejected(item: ModeratableItem): boolean {
  return normalizeModerationStatus(item?.moderationStatus) === "rejected";
}

/** Pending / in-review / omitted-as-unapproved — banner + extra row space. */
export function isUnderReview(item: ModeratableItem): boolean {
  const status = normalizeModerationStatus(item?.moderationStatus);
  return (
    status === "under_review" ||
    status === "pending" ||
    status === "in_review"
  );
}

/**
 * The ⋮ More Options control must not be gated on moderation status.
 * Card visibility is already decided by `canViewerSeeMedia`; this only
 * answers "should the owner (or any viewer of this card) get the menu?"
 */
export function shouldShowMediaActionsMenu(item: ModeratableItem): boolean {
  return item != null;
}

/**
 * Delete is owner-only. Never infer ownership from review status or a missing
 * uploader id — that would show Delete on someone else's video.
 */
export function canViewerDeleteMedia(
  item: ModeratableItem,
  viewerId?: string | null
): boolean {
  if (!item || !viewerId) return false;
  const uploaderId = extractUploaderId(item);
  if (!uploaderId) return false;
  return uploaderId === String(viewerId);
}

/**
 * Uploader id — same extractor as author attribution so lite / optimistic
 * uploads still resolve even when `uploadedBy` is a display name.
 */
export function extractUploaderId(item: ModeratableItem): string | null {
  return extractAuthorId(item as any);
}

export function isUploadedByViewer(
  item: ModeratableItem,
  viewerId?: string | null
): boolean {
  if (!viewerId) return false;
  const uploaderId = extractUploaderId(item);
  // Unknown uploader: treat as theirs. Hiding on ambiguity would erase a
  // user's own upload, which is the worse of the two failure modes.
  if (!uploaderId) return true;
  return uploaderId === String(viewerId);
}

/**
 * The single visibility predicate. Approved content is public; anything else is
 * owner-only.
 */
export function canViewerSeeMedia(
  item: ModeratableItem,
  viewerId?: string | null
): boolean {
  if (isApproved(item)) return true;
  return isUploadedByViewer(item, viewerId);
}

/** Convenience for list filtering. */
export function filterVisibleMedia<T extends ModeratableItem>(
  items: T[] | undefined | null,
  viewerId?: string | null
): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => canViewerSeeMedia(item, viewerId));
}
