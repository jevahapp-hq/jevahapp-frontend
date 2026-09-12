import assert from "node:assert/strict";
import { test } from "node:test";
import {
  shouldHideMiniPlayerForTrack,
  supportsFullScreenPlayer,
} from "./audioSourcePolicy";

test("hides the bottom mini bar for catalog, feed, and library music", () => {
  assert.equal(shouldHideMiniPlayerForTrack("copyright-free"), true);
  assert.equal(shouldHideMiniPlayerForTrack("feed"), true);
  assert.equal(shouldHideMiniPlayerForTrack("library"), true);
  assert.equal(supportsFullScreenPlayer("copyright-free"), true);
});

test("keeps the mini bar for hymn and ebook lanes", () => {
  assert.equal(shouldHideMiniPlayerForTrack("hymn"), false);
  assert.equal(shouldHideMiniPlayerForTrack("ebook"), false);
});
