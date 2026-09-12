import assert from "node:assert/strict";
import { test } from "node:test";
import {
  alignUnread,
  applyDeleteNotification,
  applyIncomingNotification,
  applyMarkAllRead,
  applyMarkRead,
  applyMarkUnread,
  dedupeNotifications,
  getUnreadCount,
  isNotificationRead,
  normalizeNotification,
  reconcileFetchedNotifications,
  type NotificationInfiniteData,
  type NotificationSnapshot,
  extractNotificationListPayload,
  groupNotificationsByRecency,
  sortNotificationsNewestFirst,
} from "./notificationCache";

function notif(
  id: string,
  isRead = false,
  extra: Record<string, unknown> = {}
) {
  return { _id: id, isRead, type: "like", title: id, ...extra };
}

function snap(
  items: ReturnType<typeof notif>[],
  unread: number
): NotificationSnapshot {
  const list: NotificationInfiniteData = {
    pages: [
      { notifications: items, unreadCount: unread, page: 1, hasMore: false },
    ],
    pageParams: [1],
  };
  return {
    list,
    stats: { unread, total: items.length, byType: { like: items.length } },
  };
}

test("normalizeNotification maps backend `read` onto isRead", () => {
  const n = normalizeNotification({ _id: "a", read: true, type: "follow" });
  assert.equal(n.isRead, true);
  assert.equal(isNotificationRead(n), true);
  assert.equal(isNotificationRead({ _id: "b", read: false }), false);
  assert.equal(isNotificationRead({ _id: "c", isRead: true, read: false }), true);
});

test("incoming notification prepends and increments badge + list unread", () => {
  const before = snap([notif("1", false)], 1);
  const { snapshot, changed } = applyIncomingNotification(
    before,
    notif("2", false)
  );
  assert.equal(changed, true);
  assert.equal(getUnreadCount(snapshot), 2);
  assert.equal(snapshot.stats?.unread, 2);
  assert.equal(snapshot.list?.pages[0].unreadCount, 2);
  assert.equal(snapshot.list?.pages[0].notifications[0]._id, "2");
});

test("duplicate incoming notification is a no-op", () => {
  const before = snap([notif("1", false)], 1);
  const first = applyIncomingNotification(before, notif("2", false));
  const second = applyIncomingNotification(first.snapshot, notif("2", false));
  assert.equal(second.changed, false);
  assert.equal(getUnreadCount(second.snapshot), 2);
});

test("already-read incoming notification does not increment unread", () => {
  const before = snap([notif("1", true)], 0);
  const { snapshot, changed } = applyIncomingNotification(
    before,
    notif("2", true)
  );
  assert.equal(changed, true);
  assert.equal(getUnreadCount(snapshot), 0);
  assert.equal(snapshot.list?.pages[0].notifications[0]._id, "2");
});

test("mark-read decrements once and is idempotent on a second apply", () => {
  const before = snap([notif("1", false), notif("2", false)], 2);
  const first = applyMarkRead(before, "1");
  assert.equal(first.changed, true);
  assert.equal(getUnreadCount(first.snapshot), 1);
  assert.equal(isNotificationRead(first.snapshot.list!.pages[0].notifications[0]), true);
  assert.equal(first.snapshot.list?.pages[0].unreadCount, 1);
  assert.equal(first.snapshot.stats?.unread, 1);

  const second = applyMarkRead(first.snapshot, "1");
  assert.equal(second.changed, false);
  assert.equal(getUnreadCount(second.snapshot), 1);
});

test("mark-read of an already-read item does not touch the badge", () => {
  const before = snap([notif("1", true)], 0);
  const result = applyMarkRead(before, "1");
  assert.equal(result.changed, false);
  assert.equal(getUnreadCount(result.snapshot), 0);
});

test("mark-read uses backend `read` alias so stale isRead cannot double-decrement", () => {
  const aliased: NotificationSnapshot = {
    list: {
      pages: [
        {
          notifications: [{ _id: "1", read: true, type: "like" }],
          unreadCount: 1,
          page: 1,
          hasMore: false,
        },
      ],
    },
    stats: { unread: 1, total: 1, byType: {} },
  };
  const result = applyMarkRead(aliased, "1");
  assert.equal(result.changed, false);
});

test("mark-unread increments and is idempotent", () => {
  const before = snap([notif("1", true)], 0);
  const first = applyMarkUnread(before, "1");
  assert.equal(first.changed, true);
  assert.equal(getUnreadCount(first.snapshot), 1);
  assert.equal(isNotificationRead(first.snapshot.list!.pages[0].notifications[0]), false);

  const second = applyMarkUnread(first.snapshot, "1");
  assert.equal(second.changed, false);
  assert.equal(getUnreadCount(second.snapshot), 1);
});

test("mark-all-read zeros badge and every loaded item", () => {
  const before = snap([notif("1", false), notif("2", false)], 5);
  const { snapshot, changed } = applyMarkAllRead(before);
  assert.equal(changed, true);
  assert.equal(getUnreadCount(snapshot), 0);
  assert.ok(
    snapshot.list!.pages[0].notifications.every((n) => isNotificationRead(n))
  );
  const again = applyMarkAllRead(snapshot);
  assert.equal(again.changed, false);
});

test("delete unread decrements; delete read does not", () => {
  const unread = applyDeleteNotification(
    snap([notif("1", false), notif("2", true)], 1),
    "1"
  );
  assert.equal(unread.changed, true);
  assert.equal(getUnreadCount(unread.snapshot), 0);
  assert.equal(unread.snapshot.list!.pages[0].notifications.length, 1);

  const read = applyDeleteNotification(
    snap([notif("1", false), notif("2", true)], 1),
    "2"
  );
  assert.equal(read.changed, true);
  assert.equal(getUnreadCount(read.snapshot), 1);
});

test("unknown mark-read still decrements stats (unloaded page) but not below zero", () => {
  const before: NotificationSnapshot = {
    list: undefined,
    stats: { unread: 3, total: 10, byType: {} },
  };
  const first = applyMarkRead(before, "missing");
  assert.equal(first.changed, true);
  assert.equal(getUnreadCount(first.snapshot), 2);

  const zeroed = applyMarkRead(
    { list: undefined, stats: { unread: 0, total: 10, byType: {} } },
    "missing"
  );
  assert.equal(zeroed.changed, false);
  assert.equal(getUnreadCount(zeroed.snapshot), 0);
});

test("alignUnread writes the same value to badge stats and page-1 list count", () => {
  const aligned = alignUnread(snap([notif("1", false)], 9), 4);
  assert.equal(aligned.stats?.unread, 4);
  assert.equal(aligned.list?.pages[0].unreadCount, 4);
});

test("stats-only snapshot (badge mounted, list not) still updates unread", () => {
  const incoming = applyIncomingNotification(
    { list: undefined, stats: { unread: 2, total: 2, byType: {} } },
    notif("n3", false)
  );
  assert.equal(incoming.changed, true);
  assert.equal(getUnreadCount(incoming.snapshot), 3);
  assert.equal(incoming.snapshot.list, undefined);
});

test("reconcileFetchedNotifications keeps optimistic read ahead of a stale server list", () => {
  const server = [notif("1", false), notif("2", false)];
  const local = [notif("1", true), notif("2", false)];
  const result = reconcileFetchedNotifications(server, 2, local);
  assert.equal(result.unreadCount, 1);
  assert.equal(isNotificationRead(result.notifications[0]), true);
  assert.equal(isNotificationRead(result.notifications[1]), false);
});

test("reconcileFetchedNotifications keeps optimistic unread ahead of a stale server read", () => {
  const result = reconcileFetchedNotifications(
    [notif("1", true)],
    0,
    [notif("1", false)]
  );
  assert.equal(result.unreadCount, 1);
  assert.equal(isNotificationRead(result.notifications[0]), false);
});

test("dedupeNotifications drops repeated ids", () => {
  const items = dedupeNotifications([
    notif("1"),
    notif("1"),
    notif("2"),
  ]);
  assert.equal(items.length, 2);
  assert.equal(items[0]._id, "1");
  assert.equal(items[1]._id, "2");
});

test("empty id patches are no-ops", () => {
  const before = snap([notif("1", false)], 1);
  assert.equal(applyMarkRead(before, "  ").changed, false);
  assert.equal(applyMarkUnread(before, "").changed, false);
  assert.equal(applyIncomingNotification(before, { title: "x" }).changed, false);
});

test("badge stats and list unread stay aligned across mixed mutations", () => {
  let state = snap([notif("1", false)], 1);
  state = applyIncomingNotification(state, notif("2", false)).snapshot;
  state = applyIncomingNotification(state, notif("2", false)).snapshot;
  state = applyMarkRead(state, "1").snapshot;
  state = applyMarkRead(state, "1").snapshot;
  state = applyMarkUnread(state, "1").snapshot;
  state = applyMarkAllRead(state).snapshot;
  assert.equal(state.stats?.unread, 0);
  assert.equal(state.list?.pages[0].unreadCount, 0);
  assert.equal(getUnreadCount(state), 0);
  assert.ok(
    state.list!.pages[0].notifications.every((n) => isNotificationRead(n))
  );
});

test("failed mark-read can be rolled back with mark-unread", () => {
  const before = snap([notif("1", false), notif("2", false)], 2);
  const optimistic = applyMarkRead(before, "1");
  assert.equal(getUnreadCount(optimistic.snapshot), 1);
  const rolledBack = applyMarkUnread(optimistic.snapshot, "1");
  assert.equal(getUnreadCount(rolledBack.snapshot), 2);
  assert.equal(
    isNotificationRead(rolledBack.snapshot.list!.pages[0].notifications[0]),
    false
  );
});

test("extracts notifications from wrapped, items, and array payloads", () => {
  const wrapped = extractNotificationListPayload({
    success: true,
    data: {
      notifications: [{ _id: "a", isRead: false, createdAt: "2026-09-12T10:00:00.000Z" }],
      unreadCount: 1,
      total: 1,
    },
  });
  assert.equal(wrapped.notifications.length, 1);
  assert.equal(wrapped.unreadCount, 1);

  const items = extractNotificationListPayload({
    data: {
      items: [{ id: "b", read: false }],
      unread: 4,
    },
  });
  assert.equal(items.notifications[0]._id, "b");
  assert.equal(items.unreadCount, 4);

  const arr = extractNotificationListPayload({
    success: true,
    data: [{ _id: "c", isRead: false }],
  });
  assert.equal(arr.notifications[0]._id, "c");
  assert.equal(arr.unreadCount, 1);
});

test("groups every notification newest-first and keeps items older than 30 days", () => {
  const now = Date.parse("2026-09-12T12:00:00.000Z");
  const rows = [
    notif("old", false, { createdAt: "2026-01-01T00:00:00.000Z" }),
    notif("new", false, { createdAt: "2026-09-12T11:00:00.000Z" }),
    notif("week", false, { createdAt: "2026-09-08T12:00:00.000Z" }),
    notif("nodate", false),
  ];
  const sections = groupNotificationsByRecency(rows, now);
  const allIds = sections.flatMap((s) => s.items.map((i) => i._id));
  assert.equal(allIds.sort().join(","), "new,nodate,old,week");
  assert.equal(sections[0].category, "New");
  assert.equal(sections[0].items[0]._id, "new");
  assert.ok(sections.some((s) => s.category === "Earlier"));
  const sorted = sortNotificationsNewestFirst(rows);
  assert.equal(sorted[0]._id, "new");
});
