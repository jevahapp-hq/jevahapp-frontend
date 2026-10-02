import assert from "node:assert/strict";
import test from "node:test";
import { reelKeyToKeepOnFeedBlur } from "./feedBlurPlayback.ts";

test("feed blur keeps the reel that just took playback", () => {
  assert.equal(reelKeyToKeepOnFeedBlur("reel-abc"), "reel-abc");
});

test("feed blur still stops a feed card", () => {
  assert.equal(reelKeyToKeepOnFeedBlur("ALL::abc"), null);
  assert.equal(reelKeyToKeepOnFeedBlur(null), null);
  assert.equal(reelKeyToKeepOnFeedBlur(undefined), null);
});
