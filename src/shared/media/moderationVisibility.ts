/**
 * Who may see content that hasn't been approved.
 *
 * Rule: unapproved media is visible only to the person who uploaded it, so they
 * can see it landed and delete it if they want. Everyone else sees nothing.
 *
 * Written as "not approved" rather than "equals under_review" on purpose — the
 * API also emits `pending`. Public catalog rows that omit the field are marked
 * approved before this check (`markUnspecifiedCatalogApproved`). An explicit
 * under_review / pending / rejected value still stays owner-only.
 */

import { extractAuthorId } from "../author/extractAuthorId";
import { readModerationStatus } from "./moderationStatus";
import { isForgottenMedia, isViewersRememberedUpload } from "./ownUploads";

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

/** Pending / in-review — banner + extra row space. Approved rows never qualify. */
export function isUnderReview(item: ModeratableItem): boolean {
  if (readModerationStatus(item) === "approved") return false;
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
  if (
    isViewersRememberedUpload(item as { _id?: string; id?: string }, viewerId) &&
    !isRejected(item)
  ) {
    return true;
  }
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
  if (item && isViewersRememberedUpload(item as { _id?: string; id?: string }, viewerId)) {
    return !isRejected(item);
  }
  if (!viewerId) return false;
  const uploaderId = extractUploaderId(item);
  if (!uploaderId) return false;
  return uploaderId === String(viewerId);
}

/**
 * Approved posts are public. A post still under review, pending, or rejected
 * is visible only to the uploader. A missing status is a public catalog row.
 */
export function canViewerSeeMedia(
  item: ModeratableItem,
  viewerId?: string | null
): boolean {
  if (isForgottenMedia(item)) return false;
  const status = readModerationStatus(item);
  if (status === "under_review" || status === "pending" || status === "rejected") {
    return isUploadedByViewer(item, viewerId);
  }
  if (status === "approved") return true;
  if (!status) return true;
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
