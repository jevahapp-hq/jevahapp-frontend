import assert from "node:assert/strict";
import { test } from "node:test";
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

test("adds space for under-review banner so menu stays visible", () => {
  assert.equal(
    getFeedVideoRowSize({ moderationStatus: "under_review" }),
    FEED_VIDEO_ROW_SIZE + FEED_VIDEO_UNDER_REVIEW_EXTRA
  );
});
