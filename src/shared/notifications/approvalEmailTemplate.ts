/**
 * Email sent once when an admin approves a creator's post.
 */

export type ApprovalEmailInput = {
  recipientName: string;
  contentTitle: string;
  contentUrl: string;
};

export type ApprovalEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { contentPublicUrl } from "../share/contentShare";

export function approvalEmailIdempotencyKey(mediaId: string): string {
  return `content-approved:${String(mediaId || "").trim()}`;
}

export function buildApprovalEmail(
  input: ApprovalEmailInput
): ApprovalEmailTemplate {
  const name = String(input.recipientName || "").trim() || "there";
  const title = String(input.contentTitle || "").trim() || "your post";
  const url = String(input.contentUrl || "").trim();
  const subject = `Your post was approved — ${title}`;
  const text = [
    `Hi ${name},`,
    "",
    `Your post "${title}" has been approved.`,
    "It is now visible in Jevah.",
    "",
    url ? `Open it here: ${url}` : "",
  ]
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n")
    .trim();

  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(title);
  const safeUrl = escapeHtml(url);
  const html = [
    `<p>Hi ${safeName},</p>`,
    `<p>Your post <strong>${safeTitle}</strong> has been approved.</p>`,
    `<p>It is now visible in Jevah.</p>`,
    safeUrl
      ? `<p><a href="${safeUrl}">Open your post</a></p>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return { subject, text, html };
}

export type ApprovalEmailAction = "watch" | "send" | "skip";

/**
 * Email only when this creator's post becomes approved.
 * Older posts that were already public are left alone.
 */
export function approvalEmailAction(params: {
  moderationStatus?: string | null;
  mediaId?: string | null;
  isOwnContent: boolean;
  alreadySent: boolean;
  wasWatching: boolean;
  justUploaded?: boolean;
}): ApprovalEmailAction {
  const mediaId = String(params.mediaId || "").trim();
  if (!params.isOwnContent || !mediaId || params.alreadySent) return "skip";
  const status = String(params.moderationStatus || "").trim().toLowerCase();
  if (status === "rejected") return "skip";
  if (status !== "approved") return "watch";
  if (params.wasWatching || params.justUploaded) return "send";
  return "skip";
}
