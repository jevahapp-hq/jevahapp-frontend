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

type Uploader =
  | string
  | { _id?: string; id?: string }
  | null
  | undefined;

export type ModeratableItem = {
  moderationStatus?: string | null;
  uploadedBy?: Uploader;
  userId?: string | null;
  author?: { _id?: string } | null;
  authorInfo?: { _id?: string } | null;
} | null | undefined;

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export function isApproved(item: ModeratableItem): boolean {
  return String(item?.moderationStatus || "").toLowerCase() === "approved";
}

export function isRejected(item: ModeratableItem): boolean {
  return String(item?.moderationStatus || "").toLowerCase() === "rejected";
}

/**
 * Uploader id, using the same precedence as `mediaDelete/ownership.ts`.
 * Returns null when it genuinely can't be determined.
 */
export function extractUploaderId(item: ModeratableItem): string | null {
  if (!item) return null;

  const uploadedBy = item.uploadedBy;
  if (uploadedBy && typeof uploadedBy === "object") {
    const id = uploadedBy._id || uploadedBy.id;
    if (id) return String(id);
  }
  if (typeof uploadedBy === "string" && OBJECT_ID.test(uploadedBy.trim())) {
    return uploadedBy.trim();
  }
  if (item.userId && OBJECT_ID.test(String(item.userId).trim())) {
    return String(item.userId).trim();
  }
  if (item.author?._id) return String(item.author._id);
  if (item.authorInfo?._id) return String(item.authorInfo._id);
  return null;
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
