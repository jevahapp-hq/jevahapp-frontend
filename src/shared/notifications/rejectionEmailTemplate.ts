/**
 * Email sent once when an admin rejects a creator's post.
 */

export type RejectionEmailInput = {
  recipientName: string;
  contentTitle: string;
  reason?: string | null;
};

export type RejectionEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

const REASON_FIELDS = [
  "rejectionReason",
  "rejection_reason",
  "moderationReason",
  "moderation_reason",
  "reviewReason",
  "review_reason",
  "declineReason",
  "decline_reason",
  "moderationNote",
  "reviewNote",
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function rejectionEmailIdempotencyKey(mediaId: string): string {
  return `content-rejected:${String(mediaId || "").trim()}`;
}

export function readRejectionReason(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const record = raw as Record<string, unknown>;
  for (const key of REASON_FIELDS) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (typeof record.reason === "string" && record.reason.trim()) {
    return record.reason.trim();
  }
  return "";
}

export function buildRejectionEmail(
  input: RejectionEmailInput
): RejectionEmailTemplate {
  const name = String(input.recipientName || "").trim() || "there";
  const title = String(input.contentTitle || "").trim() || "your post";
  const reason = String(input.reason || "").trim();
  const subject = `Your post was rejected — ${title}`;
  const text = [
    `Hi ${name},`,
    "",
    `Your post "${title}" was rejected.`,
    "It will not appear in Jevah.",
    reason ? `Reason: ${reason}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(title);
  const safeReason = escapeHtml(reason);
  const html = [
    `<p>Hi ${safeName},</p>`,
    `<p>Your post <strong>${safeTitle}</strong> was rejected.</p>`,
    `<p>It will not appear in Jevah.</p>`,
    safeReason ? `<p>Reason: ${safeReason}</p>` : "",
  ]
    .filter(Boolean)
    .join("");

  return { subject, text, html };
}

export type RejectionEmailAction = "send" | "skip";

/**
 * Email only when this creator's post becomes rejected.
 * Older rejected posts are left alone.
 */
export function rejectionEmailAction(params: {
  moderationStatus?: string | null;
  mediaId?: string | null;
  isOwnContent: boolean;
  alreadySent: boolean;
  wasWatching: boolean;
  justUploaded?: boolean;
}): RejectionEmailAction {
  const mediaId = String(params.mediaId || "").trim();
  if (!params.isOwnContent || !mediaId || params.alreadySent) return "skip";
  const status = String(params.moderationStatus || "").trim().toLowerCase();
  if (status !== "rejected") return "skip";
  if (params.wasWatching || params.justUploaded) return "send";
  return "skip";
}
