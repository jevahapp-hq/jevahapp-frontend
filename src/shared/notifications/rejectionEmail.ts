/**
 * Ask the API to email the creator once when their post is rejected.
 * The server owns delivery and must ignore a second request with the same key.
 */
import { getApiBaseUrl } from "../../core/config/environment";
import { getAuthToken } from "../../core/auth/tokenStore";
import {
  buildRejectionEmail,
  rejectionEmailIdempotencyKey,
} from "./rejectionEmailTemplate";

const SENT_KEY = "jevah.rejectionEmailSent.v1";

const memorySent = new Set<string>();
const sessionAttempted = new Set<string>();

async function readIdList(): Promise<string[]> {
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const raw = await AsyncStorage.getItem(SENT_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

async function markSent(mediaId: string): Promise<void> {
  memorySent.add(mediaId);
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const ids = (await readIdList()).filter((id) => id !== mediaId);
    ids.push(mediaId);
    await AsyncStorage.setItem(SENT_KEY, JSON.stringify(ids.slice(-200)));
  } catch {
    // Memory still blocks a second send this session.
  }
}

export async function loadRejectionEmailSentIds(): Promise<Set<string>> {
  const ids = new Set(await readIdList());
  memorySent.forEach((id) => ids.add(id));
  return ids;
}

export type RejectionEmailResult = "sent" | "duplicate" | "skipped" | "failed";

function logDelivery(
  mediaId: string,
  result: RejectionEmailResult,
  detail?: string
) {
  console.info("[rejection-email]", {
    mediaId,
    result,
    detail: detail || undefined,
    at: new Date().toISOString(),
  });
}

async function wasSent(mediaId: string): Promise<boolean> {
  if (memorySent.has(mediaId)) return true;
  const ids = await readIdList();
  if (ids.includes(mediaId)) {
    memorySent.add(mediaId);
    return true;
  }
  return false;
}

export async function notifyContentRejectedOnce(input: {
  mediaId: string;
  contentTitle: string;
  recipientName: string;
  reason?: string;
}): Promise<RejectionEmailResult> {
  const mediaId = String(input.mediaId || "").trim();
  if (!mediaId) return "skipped";
  if (await wasSent(mediaId)) return "duplicate";
  if (sessionAttempted.has(mediaId)) return "skipped";
  sessionAttempted.add(mediaId);

  const template = buildRejectionEmail({
    recipientName: input.recipientName,
    contentTitle: input.contentTitle,
    reason: input.reason,
  });

  try {
    const token = await getAuthToken();
    if (!token) {
      sessionAttempted.delete(mediaId);
      logDelivery(mediaId, "failed", "missing session");
      return "failed";
    }
    const response = await fetch(
      `${getApiBaseUrl().replace(/\/+$/, "")}/api/notifications/content-rejected`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          mediaId,
          idempotencyKey: rejectionEmailIdempotencyKey(mediaId),
          contentTitle: input.contentTitle,
          recipientName: input.recipientName,
          reason: String(input.reason || "").trim() || undefined,
          status: "rejected",
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
