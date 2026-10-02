import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRejectionEmail,
  readRejectionReason,
  rejectionEmailAction,
  rejectionEmailIdempotencyKey,
} from "./rejectionEmailTemplate.ts";

test("rejection email includes the title, rejected status, and optional reason", () => {
  const withReason = buildRejectionEmail({
    recipientName: "Ada Lovelace",
    contentTitle: "Sunday message",
    reason: "Audio is unclear",
  });
  assert.match(withReason.subject, /rejected/i);
  assert.match(withReason.subject, /Sunday message/);
  assert.match(withReason.text, /Hi Ada Lovelace/);
  assert.match(withReason.text, /was rejected/);
  assert.match(withReason.text, /Reason: Audio is unclear/);
  assert.match(withReason.html, /Audio is unclear/);
  assert.equal(rejectionEmailIdempotencyKey("abc123"), "content-rejected:abc123");

  const withoutReason = buildRejectionEmail({
    recipientName: "Ada",
    contentTitle: "Sunday message",
  });
  assert.doesNotMatch(withoutReason.text, /Reason:/);
  assert.doesNotMatch(withoutReason.html, /Reason:/);
});

test("reads a rejection reason from the fields admin review writes", () => {
  assert.equal(
    readRejectionReason({ rejectionReason: "  Copyrighted audio  " }),
    "Copyrighted audio"
  );
  assert.equal(readRejectionReason({ review_reason: "Too short" }), "Too short");
  assert.equal(readRejectionReason({ title: "Sunday message" }), "");
});

test("emails a watched post once it is rejected, and never twice", () => {
  assert.equal(
    rejectionEmailAction({
      moderationStatus: "rejected",
      mediaId: "abc",
      isOwnContent: true,
      alreadySent: false,
      wasWatching: true,
    }),
    "send"
  );
  assert.equal(
    rejectionEmailAction({
      moderationStatus: "rejected",
      mediaId: "abc",
      isOwnContent: true,
      alreadySent: true,
      wasWatching: true,
    }),
    "skip"
  );
  assert.equal(
    rejectionEmailAction({
      moderationStatus: "rejected",
      mediaId: "old",
      isOwnContent: true,
      alreadySent: false,
      wasWatching: false,
    }),
    "skip"
  );
  assert.equal(
    rejectionEmailAction({
      moderationStatus: "under_review",
      mediaId: "abc",
      isOwnContent: true,
      alreadySent: false,
      wasWatching: true,
    }),
    "skip"
  );
  assert.equal(
    rejectionEmailAction({
      moderationStatus: "rejected",
      mediaId: "abc",
      isOwnContent: true,
      alreadySent: false,
      wasWatching: false,
      justUploaded: true,
    }),
    "send"
  );
});
