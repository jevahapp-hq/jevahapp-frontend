import assert from "node:assert/strict";
import test from "node:test";
import {
  approvalEmailAction,
  approvalEmailIdempotencyKey,
  buildApprovalEmail,
  contentPublicUrl,
} from "./approvalEmailTemplate.ts";

test("approval email includes the creator name, title, confirmation, and link", () => {
  const email = buildApprovalEmail({
    recipientName: "Ada Lovelace",
    contentTitle: "Sunday message",
    contentUrl: contentPublicUrl("abc123"),
  });
  assert.match(email.subject, /approved/i);
  assert.match(email.subject, /Sunday message/);
  assert.match(email.text, /Hi Ada Lovelace/);
  assert.match(email.text, /has been approved/);
  assert.match(email.text, /https:\/\/jevahapp.com\/content\/abc123/);
  assert.match(email.html, /Open your post/);
  assert.equal(approvalEmailIdempotencyKey("abc123"), "content-approved:abc123");
});

test("emails a watched post once it is approved, and never twice", () => {
  assert.equal(
    approvalEmailAction({
      moderationStatus: "under_review",
      mediaId: "abc",
      isOwnContent: true,
      alreadySent: false,
      wasWatching: false,
    }),
    "watch"
  );
  assert.equal(
    approvalEmailAction({
      moderationStatus: "approved",
      mediaId: "abc",
      isOwnContent: true,
      alreadySent: false,
      wasWatching: true,
    }),
    "send"
  );
  assert.equal(
    approvalEmailAction({
      moderationStatus: "approved",
      mediaId: "abc",
      isOwnContent: true,
      alreadySent: true,
      wasWatching: true,
    }),
    "skip"
  );
  assert.equal(
    approvalEmailAction({
      moderationStatus: "approved",
      mediaId: "old",
      isOwnContent: true,
      alreadySent: false,
      wasWatching: false,
    }),
    "skip"
  );
  assert.equal(
    approvalEmailAction({
      moderationStatus: "approved",
      mediaId: "abc",
      isOwnContent: false,
      alreadySent: false,
      wasWatching: true,
    }),
    "skip"
  );
});
