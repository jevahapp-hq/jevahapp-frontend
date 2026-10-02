import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentVisibleNotification,
  contentVisibleLaunchItem,
  contentVisibleNotificationId,
  mergeRetainedContentVisible,
  notificationActorLabel,
  stampJevahAdmin,
} from "./contentVisibleNotification.ts";

test("builds one unread approval notice that points at the post", () => {
  const notice = buildContentVisibleNotification({
    mediaId: "abc123",
    contentTitle: "Sunday message",
    contentType: "videos",
    createdAt: "2026-09-26T12:00:00.000Z",
  });
  assert.equal(notice._id, contentVisibleNotificationId("abc123"));
  assert.equal(notice.metadata.actorName, "Jevah");
  assert.equal(notice.type, "content_approved");
  assert.equal(notice.isRead, false);
  assert.equal(notice.relatedId, "abc123");
  assert.match(notice.message, /Sunday message/);
  assert.match(notice.message, /now visible/);
  const item = contentVisibleLaunchItem(notice);
  assert.equal(item?._id, "abc123");
  assert.equal(item?.title, "Sunday message");
});

test("a post notice is from Jevah even when the server stored a person's name", () => {
  const stamped = stampJevahAdmin({
    _id: "server-1",
    type: "content_approved",
    title: "Your post is now visible",
    message: "Your post \"Sunday message\" has been approved and is now visible.",
    metadata: { actorName: "Ada Lovelace" },
  });
  assert.equal(notificationActorLabel(stamped), "Jevah");
  assert.equal(
    notificationActorLabel({
      type: "like",
      metadata: { actorName: "Ada Lovelace" },
    }),
    "Ada Lovelace"
  );
});

test("keeps a local approval notice until the server list includes that post", () => {
  const local = buildContentVisibleNotification({
    mediaId: "abc123",
    contentTitle: "Sunday message",
  });
  const first = mergeRetainedContentVisible(
    [{ _id: "like-1", type: "like", isRead: true }],
    [local]
  );
  assert.equal(first.notifications[0]._id, local._id);
  assert.equal(first.extraUnread, 1);

  const second = mergeRetainedContentVisible(
    [{ _id: "server-1", type: "content_approved", relatedId: "abc123", isRead: false }],
    [local]
  );
  assert.equal(second.notifications.length, 1);
  assert.equal(second.extraUnread, 0);
});
