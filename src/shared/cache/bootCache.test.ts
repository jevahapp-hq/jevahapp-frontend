import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOOT_FALLBACK_PREFIXES,
  FEED_PAGE_V3_PREFIX,
  RQ_FEED_SEED_V3_KEY,
  bootCacheExplicitKeys,
  bootFeedFallbackKeys,
} from "./persistKeys";

test("boot feed keys include the live v3 ALL seeds Expo Go actually writes", () => {
  const keys = bootFeedFallbackKeys();
  assert.ok(keys.includes(RQ_FEED_SEED_V3_KEY));
  assert.ok(keys.includes(`${RQ_FEED_SEED_V3_KEY}:full`));
  assert.ok(keys.includes(`${FEED_PAGE_V3_PREFIX}ALL:public:full`));
  assert.ok(keys.includes(`${FEED_PAGE_V3_PREFIX}ALL:auth:lite`));
  assert.equal(
    keys.some((k) => k.startsWith("feed-page:ALL:") && !k.includes("v3")),
    true,
    "legacy feed-page keys stay listed for older disks"
  );
});

test("explicit boot keys cover authors, session, and first-page feed", () => {
  const keys = bootCacheExplicitKeys();
  assert.ok(keys.includes("author-profiles-v1"));
  assert.ok(keys.includes("session-cache-user-id"));
  assert.ok(keys.includes(`${FEED_PAGE_V3_PREFIX}ALL:public:full`));
});

test("prefix scan covers v3 feed, music catalog, and persist blobs", () => {
  assert.ok(BOOT_FALLBACK_PREFIXES.includes(FEED_PAGE_V3_PREFIX));
  assert.ok(BOOT_FALLBACK_PREFIXES.includes("music-catalog-v1:"));
  assert.ok(BOOT_FALLBACK_PREFIXES.includes("rq-persist-v1"));
});
