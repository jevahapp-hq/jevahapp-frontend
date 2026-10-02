/**
 * In-app notice when a creator's approved post becomes visible.
 */

export type ContentVisibleInput = {
  mediaId: string;
  contentTitle: string;
  contentType?: string | null;
  createdAt?: string;
};

const CLIENT_PREFIX = "content-visible:";

export function contentVisibleNotificationId(mediaId: string): string {
  return `${CLIENT_PREFIX}${String(mediaId || "").trim()}`;
}

export function isContentVisibleNotification(notification: {
  _id?: string;
  id?: string;
  type?: string;
} | null | undefined): boolean {
  if (!notification) return false;
  if (notification.type === "content_approved") return true;
  const id = String(notification._id || notification.id || "");
  return id.startsWith(CLIENT_PREFIX);
}

export function contentVisibleMediaId(notification: {
  _id?: string;
  id?: string;
  relatedId?: string;
  metadata?: { mediaId?: string };
} | null | undefined): string {
  if (!notification) return "";
  const related = String(notification.relatedId || notification.metadata?.mediaId || "").trim();
  if (related) return related;
  const id = String(notification._id || notification.id || "");
  return id.startsWith(CLIENT_PREFIX) ? id.slice(CLIENT_PREFIX.length) : "";
}

export function isJevahAdminNotification(notification: {
  _id?: string;
  id?: string;
  type?: string;
  title?: string;
  message?: string;
} | null | undefined): boolean {
  if (!notification) return false;
  if (isContentVisibleNotification(notification)) return true;
  const type = String(notification.type || "").toLowerCase();
  if (
    type.includes("approv") ||
    type.includes("upload") ||
    type.includes("moderat") ||
    type.includes("review")
  ) {
    return true;
  }
  const text = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
  return (
    text.includes("under review") ||
    text.includes("has been approved") ||
    text.includes("now visible") ||
    text.includes("your post")
  );
}

export function notificationActorLabel(notification: {
  _id?: string;
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  metadata?: { actorName?: string };
} | null | undefined): string {
  if (isJevahAdminNotification(notification)) return "Jevah";
  return String(notification?.metadata?.actorName || "").trim() || "Someone";
}

export function stampJevahAdmin<T extends {
  _id?: string;
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  metadata?: { actorName?: string; [key: string]: unknown } | null;
}>(notification: T): T {
  if (!isJevahAdminNotification(notification)) return notification;
  return {
    ...notification,
    metadata: {
      ...(notification.metadata || {}),
      actorName: "Jevah",
    },
  };
}

export function buildContentVisibleNotification(input: ContentVisibleInput) {
  const mediaId = String(input.mediaId || "").trim();
  const title = String(input.contentTitle || "").trim() || "your post";
  const contentType = String(input.contentType || "").trim() || "videos";
  const createdAt = input.createdAt || new Date().toISOString();
  return {
    _id: contentVisibleNotificationId(mediaId),
    type: "content_approved" as const,
    title: "Your post is now visible",
    message: `Your post "${title}" has been approved and is now visible.`,
    isRead: false,
    read: false,
    relatedId: mediaId,
    createdAt,
    updatedAt: createdAt,
    priority: "high" as const,
    metadata: {
      actorName: "Jevah",
      contentTitle: title,
      contentType,
      mediaId,
    },
  };
}

export function contentVisibleLaunchItem(notification: {
  _id?: string;
  id?: string;
  type?: string;
  relatedId?: string;
  createdAt?: string;
  metadata?: { mediaId?: string; contentTitle?: string; contentType?: string };
} | null | undefined) {
  if (!isContentVisibleNotification(notification)) return null;
  const mediaId = contentVisibleMediaId(notification);
  if (!mediaId) return null;
  return {
    _id: mediaId,
    title: notification?.metadata?.contentTitle || "Untitled",
    speaker: "",
    timeAgo: "",
    views: 0,
    sheared: 0,
    saved: 0,
    favorite: 0,
    fileUrl: "",
    imageUrl: "",
    speakerAvatar: "",
    contentType: notification?.metadata?.contentType || "videos",
    createdAt: notification?.createdAt || new Date().toISOString(),
  };
}

export function mergeRetainedContentVisible<T extends {
  _id?: string;
  id?: string;
  type?: string;
  isRead?: boolean;
  read?: boolean;
  relatedId?: string;
  metadata?: { mediaId?: string };
}>(
  server: T[],
  retained: T[]
): { notifications: T[]; extraUnread: number } {
  const serverIds = new Set(
    server.map((item) => String(item._id || item.id || "")).filter(Boolean)
  );
  const serverMedia = new Set(
    server.map((item) => contentVisibleMediaId(item)).filter(Boolean)
  );
  const extra = retained.filter((item) => {
    if (!isContentVisibleNotification(item)) return false;
    const id = String(item._id || item.id || "");
    if (id && serverIds.has(id)) return false;
    const mediaId = contentVisibleMediaId(item);
    if (mediaId && serverMedia.has(mediaId)) return false;
    return true;
  });
  const extraUnread = extra.filter((item) => item.isRead !== true && item.read !== true).length;
  return {
    notifications: extra.length ? [...extra, ...server] : server,
    extraUnread,
  };
}
