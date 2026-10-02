import assert from "node:assert/strict";
import test from "node:test";
import {
  markUnspecifiedCatalogApproved,
  readModerationStatus,
} from "./moderationStatus.ts";
import { prependRecentApprovals } from "./prependRecentApprovals.ts";

test("reads admin approval from status when moderationStatus is absent", () => {
  assert.equal(readModerationStatus({ status: "approved" }), "approved");
  assert.equal(
    readModerationStatus({ moderation_status: "under_review", status: "ready" }),
    "under_review"
  );
  assert.equal(readModerationStatus({ reviewStatus: "rejected" }), "rejected");
});

test("a public catalog video with no status is marked approved", () => {
  const item = markUnspecifiedCatalogApproved({
    _id: "video-1",
    uploadedBy: { _id: "creator" },
  });
  assert.equal(item.moderationStatus, "approved");
});

test("an explicit under_review video is not rewritten as approved", () => {
  const item = markUnspecifiedCatalogApproved({
    _id: "video-2",
    moderationStatus: "under_review",
  });
  assert.equal(item.moderationStatus, "under_review");
});

test("an explicit approval is not rewritten as under review", () => {
  assert.equal(
    readModerationStatus({
      moderationStatus: "approved",
      publicationState: "under_review",
    }),
    "approved"
  );
  assert.equal(
    readModerationStatus({ status: "approved", reviewStatus: "pending" }),
    "approved"
  );
  assert.equal(
    readModerationStatus({
      moderationStatus: "under_review",
      status: "approved",
    }),
    "approved"
  );
});

test("a live publication is public even if a review field is stale", () => {
  assert.equal(
    readModerationStatus({
      moderationStatus: "under_review",
      publicationState: "live",
    }),
    "approved"
  );
  assert.equal(
    readModerationStatus({
      moderationStatus: "pending",
      publication_state: "published",
    }),
    "approved"
  );
});

test("publicationState under review stays hidden when the row is not approved", () => {
  assert.equal(
    readModerationStatus({ publicationState: "under_review", status: "live" }),
    "under_review"
  );
  assert.equal(
    readModerationStatus({ publicationState: "live", moderationStatus: "approved" }),
    "approved"
  );
  assert.equal(readModerationStatus({ isHidden: true, status: "live" }), "under_review");
});

test("status under_review is kept when the public list omits moderationStatus", () => {
  const item = markUnspecifiedCatalogApproved({
    _id: "video-3",
    status: "under_review",
  });
  assert.equal(item.moderationStatus, "under_review");
});

test("a newly approved video is placed in front of a For You page that omitted it", () => {
  const ranked = [
    {
      _id: "old",
      title: "Old",
      contentType: "videos",
      fileUrl: "https://cdn.example.com/old.mp4",
      createdAt: "2026-09-01T00:00:00.000Z",
      moderationStatus: "approved" as const,
    },
  ];
  const catalog = [
    {
      _id: "fresh",
      title: "Fresh",
      contentType: "videos",
      fileUrl: "https://cdn.example.com/fresh.mp4",
      createdAt: "2026-09-26T12:00:00.000Z",
      moderationStatus: "approved" as const,
    },
    ranked[0],
  ];
  const merged = prependRecentApprovals(
    ranked,
    catalog,
    Date.parse("2026-09-26T15:00:00.000Z")
  );
  assert.deepEqual(
    merged.map((item) => item._id),
    ["fresh", "old"]
  );
});
