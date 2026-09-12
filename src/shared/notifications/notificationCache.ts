/**
 * Single source of truth for notification list + unread badge.
 * Patches are idempotent so socket echoes and dual subscribers cannot drift counts.
 */

export const NOTIFICATION_LIST_QUERY_KEY = ["notifications"] as const;
export const NOTIFICATION_STATS_QUERY_KEY = ["notification-stats"] as const;

export type NotificationLike = {
  _id?: string;
  id?: string;
  isRead?: boolean;
  read?: boolean;
  type?: string;
  [key: string]: unknown;
};

export type NotificationListPage = {
  notifications: NotificationLike[];
  unreadCount: number;
  page: number;
  hasMore: boolean;
};

export type NotificationInfiniteData = {
  pages: NotificationListPage[];
  pageParams?: unknown[];
};

export type NotificationStatsLike = {
  total: number;
  unread: number;
  byType: { [key: string]: number };
};

export type NotificationSnapshot = {
  list: NotificationInfiniteData | undefined;
  stats: NotificationStatsLike | undefined;
};

export type PatchResult = {
  snapshot: NotificationSnapshot;
  changed: boolean;
};

function notificationId(n: NotificationLike | null | undefined): string {
  if (!n) return "";
  return String(n._id || n.id || "").trim();
}

export function isNotificationRead(
  n: NotificationLike | null | undefined
): boolean {
  if (!n) return false;
  if (typeof n.isRead === "boolean") return n.isRead;
  if (typeof n.read === "boolean") return n.read;
  return false;
}

export function withNotificationReadState<T extends NotificationLike>(
  n: T,
  isRead: boolean
): T {
  return { ...n, isRead, read: isRead };
}

export function notificationTimestamp(
  n: NotificationLike | null | undefined
): number {
  if (!n) return 0;
  const raw =
    n.createdAt ??
    n.created_at ??
    n.timestamp ??
    n.date ??
    n.updatedAt ??
    n.updated_at;
  if (raw instanceof Date) {
    const t = raw.getTime();
    return Number.isFinite(t) ? t : 0;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 0 && raw < 1e12 ? raw * 1000 : raw;
  }
  if (typeof raw === "string" && raw.trim()) {
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

export function normalizeNotification<T extends NotificationLike>(raw: T): T {
  const id = notificationId(raw);
  const ts = notificationTimestamp(raw);
  const createdAt = ts ? new Date(ts).toISOString() : raw.createdAt;
  return withNotificationReadState(
    {
      ...raw,
      _id: id || raw._id,
      id: raw.id || id,
      ...(createdAt ? { createdAt } : {}),
    },
    isNotificationRead(raw)
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function firstArray(...candidates: unknown[]): unknown[] {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function asCount(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

/** Unwrap list/count from the shapes the notifications API has returned. */
export function extractNotificationListPayload(payload: unknown): {
  notifications: NotificationLike[];
  unreadCount: number;
  total: number;
} {
  const root = asRecord(payload) ?? {};
  const data = asRecord(root.data);
  const nested = asRecord(data?.data);

  const rawItems = firstArray(
    data?.notifications,
    data?.items,
    data?.docs,
    data?.results,
    root.notifications,
    root.items,
    root.docs,
    root.results,
    nested?.notifications,
    nested?.items,
    Array.isArray(root.data) ? root.data : null,
    Array.isArray(payload) ? payload : null
  );

  const notifications = rawItems.map((item) =>
    normalizeNotification((item && typeof item === "object" ? item : {}) as NotificationLike)
  );
  const unreadFallback = notifications.filter((n) => !isNotificationRead(n)).length;
  const unreadCount = asCount(
    data?.unreadCount ??
      data?.unread ??
      root.unreadCount ??
      root.unread ??
      nested?.unreadCount ??
      nested?.unread,
    unreadFallback
  );
  const total = asCount(data?.total ?? root.total ?? nested?.total, notifications.length);

  return { notifications, unreadCount, total };
}

export type NotificationSection<T extends NotificationLike = NotificationLike> = {
  category: string;
  items: T[];
};

export function sortNotificationsNewestFirst<T extends NotificationLike>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) => notificationTimestamp(b) - notificationTimestamp(a)
  );
}

/** Newest → oldest. Never drops items, including missing/older dates. */
export function groupNotificationsByRecency<T extends NotificationLike>(
  items: T[],
  nowMs: number = Date.now()
): NotificationSection<T>[] {
  const sorted = sortNotificationsNewestFirst(items);
  const day = 24 * 60 * 60 * 1000;
  const buckets = {
    new: [] as T[],
    week: [] as T[],
    month: [] as T[],
    earlier: [] as T[],
  };

  for (const item of sorted) {
    const ts = notificationTimestamp(item);
    if (!ts) {
      buckets.earlier.push(item);
      continue;
    }
    const age = nowMs - ts;
    if (age <= day || ts > nowMs) buckets.new.push(item);
    else if (age <= 7 * day) buckets.week.push(item);
    else if (age <= 30 * day) buckets.month.push(item);
    else buckets.earlier.push(item);
  }

  const sections: NotificationSection<T>[] = [];
  if (buckets.new.length) sections.push({ category: "New", items: buckets.new });
  if (buckets.week.length) {
    sections.push({ category: "Last 7 days", items: buckets.week });
  }
  if (buckets.month.length) {
    sections.push({ category: "Last 30 days", items: buckets.month });
  }
  if (buckets.earlier.length) {
    sections.push({ category: "Earlier", items: buckets.earlier });
  }
  return sections;
}

export function getUnreadCount(snapshot: NotificationSnapshot): number {
  if (typeof snapshot.stats?.unread === "number") {
    return Math.max(0, snapshot.stats.unread);
  }
  const pageUnread = snapshot.list?.pages?.[0]?.unreadCount;
  if (typeof pageUnread === "number") {
    return Math.max(0, pageUnread);
  }
  return 0;
}

function emptyStats(unread = 0, total = 0): NotificationStatsLike {
  return { unread, total, byType: {} };
}

export function alignUnread(
  snapshot: NotificationSnapshot,
  unread: number
): NotificationSnapshot {
  const nextUnread = Math.max(0, unread);
  const stats = snapshot.stats
    ? { ...snapshot.stats, unread: nextUnread }
    : emptyStats(nextUnread, snapshot.stats?.total ?? nextUnread);

  if (!snapshot.list?.pages?.length) {
    return { list: snapshot.list, stats };
  }

  return {
    stats,
    list: {
      ...snapshot.list,
      pages: snapshot.list.pages.map((page, idx) =>
        idx === 0 || page.page === 1
          ? { ...page, unreadCount: nextUnread }
          : page
      ),
    },
  };
}

function mapPages(
  list: NotificationInfiniteData | undefined,
  mapper: (page: NotificationListPage) => NotificationListPage
): NotificationInfiniteData | undefined {
  if (!list?.pages) return list;
  return { ...list, pages: list.pages.map(mapper) };
}

function findNotification(
  list: NotificationInfiniteData | undefined,
  id: string
): NotificationLike | undefined {
  if (!id || !list?.pages) return undefined;
  for (const page of list.pages) {
    const match = (page.notifications || []).find(
      (n) => notificationId(n) === id
    );
    if (match) return match;
  }
  return undefined;
}

function setNotificationRead(
  list: NotificationInfiniteData | undefined,
  id: string,
  isRead: boolean
): NotificationInfiniteData | undefined {
  return mapPages(list, (page) => ({
    ...page,
    notifications: (page.notifications || []).map((n) =>
      notificationId(n) === id ? withNotificationReadState(n, isRead) : n
    ),
  }));
}

function bumpTypeCount(
  stats: NotificationStatsLike | undefined,
  type: string | undefined,
  delta: number
): { [key: string]: number } {
  const byType = { ...(stats?.byType || {}) };
  if (!type) return byType;
  byType[type] = Math.max(0, (byType[type] || 0) + delta);
  return byType;
}

/** Server fetch can race an optimistic mark-read; keep local read flags. */
export function reconcileFetchedNotifications(
  serverNotifications: NotificationLike[],
  serverUnread: number,
  localNotifications: NotificationLike[] | undefined
): { notifications: NotificationLike[]; unreadCount: number } {
  const normalized = (serverNotifications || []).map(normalizeNotification);
  if (!localNotifications?.length) {
    return {
      notifications: normalized,
      unreadCount: Math.max(0, serverUnread),
    };
  }

  const localById = new Map(
    localNotifications.map((n) => [notificationId(n), n] as const)
  );
  let extraReads = 0;
  let extraUnreads = 0;

  const notifications = normalized.map((server) => {
    const id = notificationId(server);
    const local = id ? localById.get(id) : undefined;
    if (!local) return server;
    const serverRead = isNotificationRead(server);
    const localRead = isNotificationRead(local);
    if (localRead && !serverRead) {
      extraReads += 1;
      return withNotificationReadState(server, true);
    }
    if (!localRead && serverRead) {
      extraUnreads += 1;
      return withNotificationReadState(server, false);
    }
    return server;
  });

  return {
    notifications,
    unreadCount: Math.max(0, serverUnread - extraReads + extraUnreads),
  };
}

export function applyIncomingNotification(
  snapshot: NotificationSnapshot,
  raw: NotificationLike
): PatchResult {
  const notification = normalizeNotification(raw);
  const id = notificationId(notification);
  if (!id) return { snapshot, changed: false };
  if (findNotification(snapshot.list, id)) {
    return { snapshot, changed: false };
  }

  const wasRead = isNotificationRead(notification);
  const unreadDelta = wasRead ? 0 : 1;
  let list = snapshot.list;

  if (list?.pages?.length) {
    const first = list.pages[0];
    list = {
      ...list,
      pages: [
        {
          ...first,
          notifications: [notification, ...(first.notifications || [])],
        },
        ...list.pages.slice(1),
      ],
    };
  }

  const unread = getUnreadCount(snapshot) + unreadDelta;
  const stats = snapshot.stats
    ? {
        ...snapshot.stats,
        unread,
        total: (snapshot.stats.total || 0) + 1,
        byType: bumpTypeCount(snapshot.stats, notification.type, 1),
      }
    : emptyStats(unread, unread);

  return {
    changed: true,
    snapshot: alignUnread({ list, stats }, unread),
  };
}

export function applyMarkRead(
  snapshot: NotificationSnapshot,
  notificationIdValue: string
): PatchResult {
  const id = String(notificationIdValue || "").trim();
  if (!id) return { snapshot, changed: false };

  const existing = findNotification(snapshot.list, id);
  if (existing && isNotificationRead(existing)) {
    return { snapshot, changed: false };
  }

  // Unknown id still decrements once — another device may have read an unloaded item.
  // Callers must dedupe socket events. Skip when badge is already zero.
  if (!existing && getUnreadCount(snapshot) === 0) {
    return { snapshot, changed: false };
  }

  const list = existing
    ? setNotificationRead(snapshot.list, id, true)
    : snapshot.list;
  const unread = Math.max(0, getUnreadCount(snapshot) - 1);
  const stats = snapshot.stats
    ? { ...snapshot.stats, unread }
    : emptyStats(unread, snapshot.stats?.total ?? unread);

  return {
    changed: true,
    snapshot: alignUnread({ list, stats }, unread),
  };
}

export function applyMarkUnread(
  snapshot: NotificationSnapshot,
  notificationIdValue: string
): PatchResult {
  const id = String(notificationIdValue || "").trim();
  if (!id) return { snapshot, changed: false };

  const existing = findNotification(snapshot.list, id);
  if (existing && !isNotificationRead(existing)) {
    return { snapshot, changed: false };
  }

  const list = existing
    ? setNotificationRead(snapshot.list, id, false)
    : snapshot.list;
  const unread = getUnreadCount(snapshot) + 1;
  const stats = snapshot.stats
    ? { ...snapshot.stats, unread }
    : emptyStats(unread);

  return {
    changed: true,
    snapshot: alignUnread({ list, stats }, unread),
  };
}

export function applyMarkAllRead(snapshot: NotificationSnapshot): PatchResult {
  if (getUnreadCount(snapshot) === 0) {
    const hasUnreadItem = snapshot.list?.pages?.some((page) =>
      (page.notifications || []).some((n) => !isNotificationRead(n))
    );
    if (!hasUnreadItem) return { snapshot, changed: false };
  }

  const list = mapPages(snapshot.list, (page) => ({
    ...page,
    notifications: (page.notifications || []).map((n) =>
      withNotificationReadState(n, true)
    ),
    unreadCount: 0,
  }));
  const stats = snapshot.stats
    ? { ...snapshot.stats, unread: 0 }
    : emptyStats(0, snapshot.stats?.total ?? 0);

  return {
    changed: true,
    snapshot: { list, stats },
  };
}

export function applyDeleteNotification(
  snapshot: NotificationSnapshot,
  notificationIdValue: string
): PatchResult {
  const id = String(notificationIdValue || "").trim();
  if (!id) return { snapshot, changed: false };

  const existing = findNotification(snapshot.list, id);
  if (snapshot.list && !existing) {
    return { snapshot, changed: false };
  }

  const wasUnread = existing ? !isNotificationRead(existing) : false;
  const list = mapPages(snapshot.list, (page) => ({
    ...page,
    notifications: (page.notifications || []).filter(
      (n) => notificationId(n) !== id
    ),
  }));
  const unread = wasUnread
    ? Math.max(0, getUnreadCount(snapshot) - 1)
    : getUnreadCount(snapshot);
  const stats = snapshot.stats
    ? {
        ...snapshot.stats,
        unread,
        total: Math.max(0, (snapshot.stats.total || 0) - (existing ? 1 : 0)),
      }
    : snapshot.stats;

  return {
    changed: true,
    snapshot: alignUnread({ list, stats }, unread),
  };
}

export function dedupeNotifications<T extends NotificationLike>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const id = notificationId(item);
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    out.push(item);
  }
  return out;
}
