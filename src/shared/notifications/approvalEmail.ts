/**
 * Ask the API to email the creator once when their post is approved.
 * The server owns delivery and must ignore a second request with the same key.
 */
import { getApiBaseUrl } from "../../core/config/environment";
import { getAuthToken } from "../../core/auth/tokenStore";
import { extractAuthorId } from "../author/extractAuthorId";
import { readModerationStatus } from "../media/moderationStatus";
import { isRememberedOwnUpload } from "../media/ownUploads";
import {
  approvalEmailAction,
  approvalEmailIdempotencyKey,
  buildApprovalEmail,
  contentPublicUrl,
} from "./approvalEmailTemplate";
import { publishContentVisibleNotification } from "./publishContentVisibleNotification";
import { notifyContentRejectedOnce, loadRejectionEmailSentIds } from "./rejectionEmail";
import {
  readRejectionReason,
  rejectionEmailAction,
} from "./rejectionEmailTemplate";

const SENT_KEY = "jevah.approvalEmailSent.v1";
const WATCH_KEY = "jevah.approvalEmailWatch.v1";

const memorySent = new Set<string>();
const memoryWatch = new Set<string>();
const sessionAttempted = new Set<string>();

async function readIdList(key: string): Promise<string[]> {
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const raw = await AsyncStorage.getItem(key);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

async function writeIdList(key: string, ids: string[]): Promise<void> {
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    await AsyncStorage.setItem(key, JSON.stringify(ids.slice(-200)));
  } catch {
    // Memory still covers this session.
  }
}

async function wasSent(mediaId: string): Promise<boolean> {
  if (memorySent.has(mediaId)) return true;
  const ids = await readIdList(SENT_KEY);
  if (ids.includes(mediaId)) {
    memorySent.add(mediaId);
    return true;
  }
  return false;
}

async function markSent(mediaId: string): Promise<void> {
  memorySent.add(mediaId);
  const ids = (await readIdList(SENT_KEY)).filter((id) => id !== mediaId);
  ids.push(mediaId);
  await writeIdList(SENT_KEY, ids);
}

async function markWatching(mediaId: string): Promise<void> {
  if (memoryWatch.has(mediaId)) return;
  memoryWatch.add(mediaId);
  const ids = (await readIdList(WATCH_KEY)).filter((id) => id !== mediaId);
  ids.push(mediaId);
  await writeIdList(WATCH_KEY, ids);
}

export type ApprovalEmailResult = "sent" | "duplicate" | "skipped" | "failed";

function logDelivery(mediaId: string, result: ApprovalEmailResult, detail?: string) {
  console.info("[approval-email]", {
    mediaId,
    result,
    detail: detail || undefined,
    at: new Date().toISOString(),
  });
}

export async function notifyContentApprovedOnce(input: {
  mediaId: string;
  contentTitle: string;
  recipientName: string;
}): Promise<ApprovalEmailResult> {
  const mediaId = String(input.mediaId || "").trim();
  if (!mediaId) return "skipped";
  if (await wasSent(mediaId)) return "duplicate";
  if (sessionAttempted.has(mediaId)) return "skipped";
  sessionAttempted.add(mediaId);

  const template = buildApprovalEmail({
    recipientName: input.recipientName,
    contentTitle: input.contentTitle,
    contentUrl: contentPublicUrl(mediaId),
  });

  try {
    const token = await getAuthToken();
    if (!token) {
      sessionAttempted.delete(mediaId);
      logDelivery(mediaId, "failed", "missing session");
      return "failed";
    }
    const response = await fetch(
      `${getApiBaseUrl().replace(/\/+$/, "")}/api/notifications/content-approved`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          mediaId,
          idempotencyKey: approvalEmailIdempotencyKey(mediaId),
          contentTitle: input.contentTitle,
          contentUrl: contentPublicUrl(mediaId),
          recipientName: input.recipientName,
          template,
        }),
      }
    );
    if (response.status === 409) {
      await markSent(mediaId);
      logDelivery(mediaId, "duplicate");
      return "duplicate";
    }
    if (!response.ok) {
      logDelivery(mediaId, "failed", `HTTP ${response.status}`);
      return "failed";
    }
    const body = await response.json().catch(() => ({}));
    if (body?.duplicate === true || body?.alreadySent === true) {
      await markSent(mediaId);
      logDelivery(mediaId, "duplicate");
      return "duplicate";
    }
    await markSent(mediaId);
    logDelivery(mediaId, "sent");
    return "sent";
  } catch (error) {
    logDelivery(
      mediaId,
      "failed",
      error instanceof Error ? error.message : "network"
    );
    return "failed";
  }
}

function itemTitle(item: Record<string, unknown>): string {
  return String(item.title || "").trim();
}

function itemName(item: Record<string, unknown>, fallback: string): string {
  if (fallback) return fallback;
  const uploadedBy = item.uploadedBy;
  if (uploadedBy && typeof uploadedBy === "object") {
    const person = uploadedBy as { firstName?: string; lastName?: string; name?: string };
    const combined = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
    return combined || String(person.name || "").trim();
  }
  return String(item.uploadedByName || item.speaker || "").trim();
}

/**
 * Watch the creator's posts that are not approved yet.
 * Send the approval email when one of those posts later shows as approved.
 */
export async function syncApprovalEmails(
  items: unknown,
  viewer: { id?: string | null; name?: string | null },
  options?: { justUploaded?: boolean }
): Promise<void> {
  const viewerId = String(viewer.id || "").trim();
  if (!viewerId || !Array.isArray(items)) return;
  const name = String(viewer.name || "").trim();
  const sent = new Set(await readIdList(SENT_KEY));
  memorySent.forEach((id) => sent.add(id));
  const watching = new Set(await readIdList(WATCH_KEY));
  memoryWatch.forEach((id) => watching.add(id));
  const rejectionSent = await loadRejectionEmailSentIds();

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const mediaId = String(item._id || item.id || "").trim();
    if (!mediaId) continue;
    const ownerId = extractAuthorId(item as any);
    const isOwn =
      ownerId === viewerId ||
      isRememberedOwnUpload(item as any) ||
      options?.justUploaded === true;
    const status = readModerationStatus(item);
    const wasWatching = watching.has(mediaId);
    const justUploaded = options?.justUploaded === true;
    const action = approvalEmailAction({
      moderationStatus: status,
      mediaId,
      isOwnContent: isOwn,
      alreadySent: sent.has(mediaId),
      wasWatching,
      justUploaded,
    });
    if (action === "watch") {
      await markWatching(mediaId);
    } else if (action === "send") {
      await notifyContentApprovedOnce({
        mediaId,
        contentTitle: itemTitle(item),
        recipientName: itemName(item, name),
      });
      await publishContentVisibleNotification({
        mediaId,
        contentTitle: itemTitle(item),
        contentType: String(item.contentType || item.type || ""),
      });
    }
    if (
      rejectionEmailAction({
        moderationStatus: status,
        mediaId,
        isOwnContent: isOwn,
        alreadySent: rejectionSent.has(mediaId),
        wasWatching,
        justUploaded,
      }) === "send"
    ) {
      await notifyContentRejectedOnce({
        mediaId,
        contentTitle: itemTitle(item),
        recipientName: itemName(item, name),
        reason: readRejectionReason(item),
      });
    }
  }
}
