import assert from "node:assert/strict";
import { test } from "node:test";
import {
  baselineToggleCount,
  baselineToggleFlag,
  mergeHydratedCount,
  pickLocalFirstCount,
  reconcileToggleCount,
  reconcileToggleFlag,
} from "./engagementToggle";

test("local cache wins over a higher stale feed count so unlike can decrease", () => {
  assert.equal(
    pickLocalFirstCount({
      cachedCount: 4,
      cacheIsFresh: true,
      storeCount: 5,
      fallbacks: [9],
    }),
    4
  );
});

test("store count wins after cache expires, including zero", () => {
  assert.equal(
    pickLocalFirstCount({
      cacheIsFresh: false,
      storeCount: 0,
      fallbacks: [12],
    }),
    0
  );
});

test("cold start uses the highest feed fallback", () => {
  assert.equal(
    pickLocalFirstCount({
      cacheIsFresh: false,
      fallbacks: [2, 7, undefined],
    }),
    7
  );
});

test("hydrate keeps an in-flight optimistic count", () => {
  assert.equal(
    mergeHydratedCount({
      hasActiveToggle: true,
      existing: 6,
      cached: 6,
      cacheIsFresh: true,
      incoming: 5,
    }),
    6
  );
});

test("hydrate prefers a fresh local unlike over a higher server total", () => {
  assert.equal(
    mergeHydratedCount({
      hasActiveToggle: false,
      existing: 8,
      cached: 7,
      cacheIsFresh: true,
      incoming: 8,
    }),
    7
  );
});

test("liked mismatch keeps the optimistic heart", () => {
  assert.equal(
    reconcileToggleFlag({ optimistic: true, server: false }),
    true
  );
  assert.equal(
    reconcileToggleFlag({ optimistic: false, server: true }),
    false
  );
  assert.equal(
    reconcileToggleFlag({ optimistic: true, server: true }),
    true
  );
});

test("count stays optimistic when the liked flag disagrees", () => {
  assert.equal(
    reconcileToggleCount({
      optimisticCount: 3,
      serverCount: 2,
      flagMismatch: true,
    }),
    3
  );
  assert.equal(
    reconcileToggleCount({
      optimisticCount: 3,
      serverCount: 4,
      flagMismatch: false,
    }),
    4
  );
});

test("seeded baseline beats a hydrated false/zero store entry", () => {
  assert.equal(baselineToggleFlag(true, false), true);
  assert.equal(baselineToggleFlag(undefined, false), false);
  assert.equal(baselineToggleCount(10, 0), 10);
  assert.equal(baselineToggleCount(undefined, 4), 4);
});
