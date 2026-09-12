/**
 * Applies notification cache patches to React Query exactly once.
 * Socket listeners are ref-counted so Header badge + notification center
 * cannot double-increment / double-decrement unread.
 */
import type { QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";
import {
  acquireNotificationSocket,
  getSharedNotificationSocket,
  releaseNotificationSocket,
} from "@/app/services/notificationSocket";
import {
  applyDeleteNotification,
  applyIncomingNotification,
  applyMarkAllRead,
  applyMarkRead,
  applyMarkUnread,
  NOTIFICATION_LIST_QUERY_KEY,
  NOTIFICATION_STATS_QUERY_KEY,
  type NotificationInfiniteData,
  type NotificationLike,
  type NotificationSnapshot,
  type NotificationStatsLike,
  type PatchResult,
} from "./notificationCache";
import { notificationAPIService } from "@/app/services/NotificationAPIService";

const EVENT_TTL_MS = 15_000;

let subscriberCount = 0;
let activeClient: QueryClient | null = null;
let processedEvents = new Map<string, number>();
let appStateSub: { remove: () => void } | null = null;
let socketBound = false;

function payloadId(payload: unknown): string {
  if (typeof payload === "string" || typeof payload === "number") {
    return String(payload).trim();
  }
  if (!payload || typeof payload !== "object") return "";
  const rec = payload as { _id?: unknown; id?: unknown; notificationId?: unknown };
  return String(rec._id || rec.id || rec.notificationId || "").trim();
}

function payloadNotification(payload: unknown): NotificationLike | null {
  if (!payload || typeof payload !== "object") return null;
  const rec = payload as NotificationLike & { notification?: NotificationLike };
  if (rec.notification && typeof rec.notification === "object") {
    return rec.notification;
  }
  if (rec._id || rec.id) return rec;
  return rec;
}

const handlers = {
  onNew: (payload: unknown) => {
    const notification = payloadNotification(payload);
    const id = notification ? payloadId(notification) : "";
    if (!notification || !id) return;
    if (!rememberEvent(`new:${id}`)) return;
    patchActive((snap) => applyIncomingNotification(snap, notification));
  },
  onRead: (payload: unknown) => {
    const id = payloadId(payload);
    if (!id || !rememberEvent(`read:${id}`)) return;
    patchActive((snap) => applyMarkRead(snap, id));
  },
  onUnread: (payload: unknown) => {
    const id = payloadId(payload);
    if (!id || !rememberEvent(`unread:${id}`)) return;
    patchActive((snap) => applyMarkUnread(snap, id));
  },
  onDeleted: (payload: unknown) => {
    const id = payloadId(payload);
    if (!id || !rememberEvent(`delete:${id}`)) return;
    patchActive((snap) => applyDeleteNotification(snap, id));
  },
  onMarkAll: () => {
    if (!rememberEvent("all-read")) return;
    patchActive((snap) => applyMarkAllRead(snap));
  },
};

function rememberEvent(key: string): boolean {
  if (!key || key.endsWith(":")) return false;
  const now = Date.now();
  for (const [k, exp] of processedEvents) {
    if (exp <= now) processedEvents.delete(k);
  }
  if (processedEvents.has(key)) return false;
  processedEvents.set(key, now + EVENT_TTL_MS);
  return true;
}

export function readNotificationSnapshot(
  queryClient: QueryClient
): NotificationSnapshot {
  return {
    list: queryClient.getQueryData<NotificationInfiniteData>(
      NOTIFICATION_LIST_QUERY_KEY
    ),
    stats: queryClient.getQueryData<NotificationStatsLike>(
      NOTIFICATION_STATS_QUERY_KEY
    ),
  };
}

export function writeNotificationSnapshot(
  queryClient: QueryClient,
  snapshot: NotificationSnapshot,
  options?: { restore?: boolean }
): void {
  if (options?.restore) {
    queryClient.setQueryData(NOTIFICATION_LIST_QUERY_KEY, snapshot.list);
    queryClient.setQueryData(NOTIFICATION_STATS_QUERY_KEY, snapshot.stats);
    return;
  }
  if (snapshot.list !== undefined) {
    queryClient.setQueryData(NOTIFICATION_LIST_QUERY_KEY, snapshot.list);
  }
  if (snapshot.stats !== undefined) {
    queryClient.setQueryData(NOTIFICATION_STATS_QUERY_KEY, snapshot.stats);
  }
}

export function patchNotificationQueries(
  queryClient: QueryClient,
  reducer: (snapshot: NotificationSnapshot) => PatchResult
): boolean {
  const { snapshot, changed } = reducer(readNotificationSnapshot(queryClient));
  if (!changed) return false;
  writeNotificationSnapshot(queryClient, snapshot);
  return true;
}

function patchActive(
  reducer: (snapshot: NotificationSnapshot) => PatchResult
): boolean {
  if (!activeClient) return false;
  return patchNotificationQueries(activeClient, reducer);
}

async function bindSocket(): Promise<void> {
  try {
    const socket = await acquireNotificationSocket();
    if (!socket || subscriberCount === 0) {
      if (!socket) releaseNotificationSocket();
      return;
    }
    socket.on("new_notification", handlers.onNew);
    socket.on("notification_read", handlers.onRead);
    socket.on("notification_unread", handlers.onUnread);
    socket.on("notification_deleted", handlers.onDeleted);
    socket.on("all_notifications_read", handlers.onMarkAll);
    socketBound = true;
  } catch (error) {
    if (__DEV__) console.error("Error initializing notification socket:", error);
  }
}

function unbindSocket(): void {
  const socket = getSharedNotificationSocket();
  if (socket && socketBound) {
    socket.off("new_notification", handlers.onNew);
    socket.off("notification_read", handlers.onRead);
    socket.off("notification_unread", handlers.onUnread);
    socket.off("notification_deleted", handlers.onDeleted);
    socket.off("all_notifications_read", handlers.onMarkAll);
  }
  socketBound = false;
  releaseNotificationSocket();
}

function refetchNotificationQueries(): void {
  if (!activeClient) return;
  void activeClient.invalidateQueries({
    queryKey: NOTIFICATION_STATS_QUERY_KEY,
  });
  void activeClient.invalidateQueries({
    queryKey: NOTIFICATION_LIST_QUERY_KEY,
  });
}

/** One shared subscription for badge + list. */
export function subscribeNotificationRealtime(
  queryClient: QueryClient
): () => void {
  subscriberCount += 1;
  activeClient = queryClient;

  if (subscriberCount === 1) {
    processedEvents = new Map();
    void bindSocket();
    appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "active") refetchNotificationQueries();
    });
  }

  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount > 0) return;
    appStateSub?.remove();
    appStateSub = null;
    unbindSocket();
    activeClient = null;
    processedEvents = new Map();
  };
}

export async function fetchNotificationStats(
  _queryClient: QueryClient
): Promise<NotificationStatsLike> {
  return notificationAPIService.getStats();
}

export async function cancelNotificationFetches(
  queryClient: QueryClient
): Promise<void> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: NOTIFICATION_LIST_QUERY_KEY }),
    queryClient.cancelQueries({ queryKey: NOTIFICATION_STATS_QUERY_KEY }),
  ]);
}

export function rememberLocalRead(notificationId: string): void {
  rememberEvent(`read:${notificationId}`);
}

export function rememberLocalUnread(notificationId: string): void {
  rememberEvent(`unread:${notificationId}`);
}

export function rememberLocalMarkAll(): void {
  rememberEvent("all-read");
}
