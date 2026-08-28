import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildFeedInfiniteData,
  shouldSeedFeedPage,
} from "./feedSeedInfiniteData";

test("empty disk does not seed — list waits for network", () => {
  assert.equal(shouldSeedFeedPage([]), false);
  assert.equal(shouldSeedFeedPage(null), false);
  assert.equal(shouldSeedFeedPage(undefined), false);
});

test("one cached item is enough to paint frame 0", () => {
  assert.equal(shouldSeedFeedPage([{ id: "1" }]), true);
});

test("seed writes pages[0].media for both chrono and for-you", () => {
  const result = {
    media: [{ id: "a" }],
    total: 1,
    page: 1,
    limit: 12,
    cursor: null,
    hasMore: true,
  };
  const chrono = buildFeedInfiniteData(result, false);
  const forYou = buildFeedInfiniteData(result, true);
  assert.equal(chrono.pages[0].media.length, 1);
  assert.equal(chrono.pages[0].source, "all_content");
  assert.equal(chrono.pageParams[0], 1);
  assert.equal(forYou.pages[0].source, "for_you");
  assert.equal(forYou.pageParams[0], null);
});
