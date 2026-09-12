import assert from "node:assert/strict";
import { test } from "node:test";
import { getUnderReviewExtraRowSize } from "../../../shared/media/underReviewBannerLayout";
import {
  FEED_VIDEO_ROW_SIZE,
  FEED_VIDEO_UNDER_REVIEW_EXTRA,
  getFeedVideoRowSize,
} from "./feedVideoConfig";

test("uses base size for approved videos", () => {
  assert.equal(
    getFeedVideoRowSize({ moderationStatus: "approved" }),
    FEED_VIDEO_ROW_SIZE
  );
  assert.equal(getFeedVideoRowSize(), FEED_VIDEO_ROW_SIZE);
});

test("adds enough space for the wrapped under-review banner", () => {
  const width = 390;
  const extra = Math.max(
    FEED_VIDEO_UNDER_REVIEW_EXTRA,
    getUnderReviewExtraRowSize(width)
  );
  assert.equal(
    getFeedVideoRowSize({
      moderationStatus: "under_review",
      viewportWidth: width,
    }),
    FEED_VIDEO_ROW_SIZE + extra
  );
  assert.ok(extra >= FEED_VIDEO_UNDER_REVIEW_EXTRA);
});

test("small phones get more row extra than the 72px that used to clip copy", () => {
  const small = getFeedVideoRowSize({
    moderationStatus: "under_review",
    viewportWidth: 320,
  });
  const large = getFeedVideoRowSize({
    moderationStatus: "under_review",
    viewportWidth: 1280,
  });
  assert.ok(small > FEED_VIDEO_ROW_SIZE + 72);
  assert.ok(large > FEED_VIDEO_ROW_SIZE);
  assert.ok(small >= large);
});

test("adds space for pending as well as under-review", () => {
  const pending = getFeedVideoRowSize({
    moderationStatus: "pending",
    viewportWidth: 390,
  });
  const review = getFeedVideoRowSize({
    moderationStatus: "under_review",
    viewportWidth: 390,
  });
  assert.equal(pending, review);
  assert.ok(pending > FEED_VIDEO_ROW_SIZE);
});

test("rejected overlay does not reserve footer banner space", () => {
  assert.equal(
    getFeedVideoRowSize({
      moderationStatus: "rejected",
      viewportWidth: 320,
    }),
    FEED_VIDEO_ROW_SIZE
  );
});

test("every supported breakpoint keeps under-review rows taller than the clip floor", () => {
  for (const width of [320, 360, 375, 430, 768, 1024, 1280]) {
    const size = getFeedVideoRowSize({
      moderationStatus: "under_review",
      viewportWidth: width,
    });
    assert.ok(
      size >= FEED_VIDEO_ROW_SIZE + FEED_VIDEO_UNDER_REVIEW_EXTRA,
      `width ${width}: row ${size}`
    );
  }
});
