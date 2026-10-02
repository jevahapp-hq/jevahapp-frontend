/**
 * Approval status as the API actually sends it.
 * `status: "approved"` is an approval, not a processing stage.
 * Public catalog rows often omit the field; those are already public.
 */

const APPROVED = new Set([
  "approved",
  "approve",
  "published",
  "public",
  "active",
  "live",
]);
const PENDING = new Set(["pending", "in_review", "under_review", "review"]);
const HIDDEN = new Set([
  "draft",
  "unpublished",
  "hidden",
  "private",
  "not_published",
]);
const REJECTED = new Set(["rejected", "declined"]);

export function normalizeModerationToken(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function isModerationToken(value?: string | null): boolean {
  const token = normalizeModerationToken(value);
  return (
    APPROVED.has(token) ||
    PENDING.has(token) ||
    HIDDEN.has(token) ||
    REJECTED.has(token)
  );
}

export type ResolvedModerationStatus =
  | "approved"
  | "under_review"
  | "pending"
  | "rejected";

function resolveToken(value?: string | null): ResolvedModerationStatus | undefined {
  const token = normalizeModerationToken(value);
  if (!token) return undefined;
  if (token === "pending") return "pending";
  if (PENDING.has(token) || HIDDEN.has(token)) return "under_review";
  if (REJECTED.has(token)) return "rejected";
  if (APPROVED.has(token)) return "approved";
  return undefined;
}

/**
 * An explicit `approved` status wins. Other review or hidden fields still
 * win over live/public, so an unapproved post is not treated as public.
 */
function isExplicitlyApproved(value?: string | null): boolean {
  return normalizeModerationToken(value) === "approved";
}

/** A live publication is already public, even if a review field was left behind. */
function isPubliclyLive(raw: any): boolean {
  const publication = normalizeModerationToken(
    raw.publicationState || raw.publication_state
  );
  return (
    publication === "live" ||
    publication === "public" ||
    publication === "published"
  );
}

export function readModerationStatus(raw: any): ResolvedModerationStatus | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  // An admin approval is final. A leftover review field must not put the
  // "only visible to you" banner on a video that is already approved.
  if (
    isExplicitlyApproved(raw.moderationStatus) ||
    isExplicitlyApproved(raw.moderation_status) ||
    isExplicitlyApproved(raw.status) ||
    isPubliclyLive(raw)
  ) {
    return "approved";
  }
  const values = [
    raw.moderationStatus,
    raw.moderation_status,
    raw.reviewStatus,
    raw.review_status,
    raw.approvalStatus,
    raw.approval_status,
    raw.publicationState,
    raw.publication_state,
    raw.moderation?.status,
    raw.review?.status,
    raw.status,
  ];
  let approved = false;
  for (const value of values) {
    const resolved = resolveToken(value);
    if (
      resolved === "under_review" ||
      resolved === "pending" ||
      resolved === "rejected"
    ) {
      return resolved;
    }
    if (resolved === "approved") approved = true;
  }
  if (raw.isHidden === true || raw.is_hidden === true) return "under_review";
  return approved ? "approved" : undefined;
}

/**
 * A public list row with no approval field is already on the public feed.
 * Rows that say under_review / pending / rejected keep that status.
 */
export function markUnspecifiedCatalogApproved<T extends { moderationStatus?: string | null }>(
  item: T
): T {
  if (!item) return item;
  const resolved = readModerationStatus(item);
  if (
    resolved === "under_review" ||
    resolved === "pending" ||
    resolved === "rejected"
  ) {
    return item.moderationStatus === resolved
      ? item
      : { ...item, moderationStatus: resolved };
  }
  if (resolved === "approved") {
    return normalizeModerationToken(item.moderationStatus) === "approved"
      ? item
      : { ...item, moderationStatus: "approved" };
  }
  if (normalizeModerationToken(item.moderationStatus)) return item;
  return { ...item, moderationStatus: "approved" };
}

export function markUnspecifiedCatalogItemsApproved<T extends { moderationStatus?: string | null }>(
  items: T[]
): T[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => markUnspecifiedCatalogApproved(item));
}
