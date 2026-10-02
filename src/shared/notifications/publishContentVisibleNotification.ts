/**
 * Create the in-app approval notice once and ask the API to store it.
 */
import { getApiBaseUrl } from "../../core/config/environment";
import { getAuthToken } from "../../core/auth/tokenStore";
import { applyIncomingNotification } from "./notificationCache";
import { patchActiveNotification } from "./notificationQuerySync";
import {
  buildContentVisibleNotification,
  contentVisibleMediaId,
  contentVisibleNotificationId,
} from "./contentVisibleNotification";
import { retainContentVisible } from "./contentVisibleStore";

const announced = new Set<string>();

function logDelivery(mediaId: string, result: string, detail?: string) {
  console.info("[content-visible]", {
    mediaId,
    result,
    detail: detail || undefined,
    at: new Date().toISOString(),
  });
}

function serverNotification(body: any, fallback: ReturnType<typeof buildContentVisibleNotification>) {
  const created =
    body?.data?.notification ||
    body?.notification ||
    (body?.data?._id || body?.data?.id ? body.data : null);
  if (!created || typeof created !== "object") return fallback;
  const id = String(created._id || created.id || "").trim();
  if (!id) return fallback;
  return {
    ...fallback,
    ...created,
    _id: id,
    type: "content_approved",
    relatedId: contentVisibleMediaId(created) || fallback.relatedId,
    isRead: false,
    read: false,
    metadata: {
      ...fallback.metadata,
      ...(created.metadata || {}),
      mediaId: fallback.relatedId,
      contentTitle: fallback.metadata.contentTitle,
      actorName: "Jevah",
    },
  };
}

export async function publishContentVisibleNotification(input: {
  mediaId: string;
  contentTitle: string;
  contentType?: string | null;
}): Promise<"sent" | "duplicate" | "failed"> {
  const mediaId = String(input.mediaId || "").trim();
  if (!mediaId) return "failed";
  if (announced.has(mediaId)) return "duplicate";
  announced.add(mediaId);

  const local = buildContentVisibleNotification(input);
  const show = (notification: typeof local) => {
    patchActiveNotification((snapshot) =>
      applyIncomingNotification(snapshot, notification)
    );
  };

  try {
    const token = await getAuthToken();
    if (!token) {
      announced.delete(mediaId);
      show(local);
      await retainContentVisible(local);
      logDelivery(mediaId, "failed", "missing session");
      return "failed";
    }
    const response = await fetch(
      `${getApiBaseUrl().replace(/\/+$/, "")}/api/notifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          type: "content_approved",
          title: local.title,
          message: local.message,
          relatedId: mediaId,
          idempotencyKey: contentVisibleNotificationId(mediaId),
          metadata: local.metadata,
        }),
      }
    );
    if (response.status === 409) {
      show(local);
      await retainContentVisible(local);
      logDelivery(mediaId, "duplicate");
      return "duplicate";
    }
    if (!response.ok) {
      show(local);
      await retainContentVisible(local);
      logDelivery(mediaId, "failed", `HTTP ${response.status}`);
      return "failed";
    }
    const body = await response.json().catch(() => ({}));
    const stored = serverNotification(body, local);
    if (body?.duplicate === true || body?.alreadySent === true) {
      show(stored);
      await retainContentVisible(stored);
      logDelivery(mediaId, "duplicate");
      return "duplicate";
    }
    show(stored);
    await retainContentVisible(stored);
    logDelivery(mediaId, "sent");
    return "sent";
  } catch (error) {
    show(local);
    await retainContentVisible(local);
    logDelivery(
      mediaId,
      "failed",
      error instanceof Error ? error.message : "network"
    );
    return "failed";
  }
}
