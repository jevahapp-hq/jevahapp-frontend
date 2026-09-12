import assert from "node:assert/strict";
import { test } from "node:test";
import { videoKeyMatchesContentId } from "./videoPlayerKey";

test("matches feed playback keys and raw ids", () => {
  assert.equal(videoKeyMatchesContentId("ALL::abc", "abc"), true);
  assert.equal(videoKeyMatchesContentId("videos::abc", "abc"), true);
  assert.equal(videoKeyMatchesContentId("abc", "abc"), true);
  assert.equal(videoKeyMatchesContentId("ALL::zzz", "abc"), false);
});

test("matches Reels player keys so comment HUD binds the fullscreen video", () => {
  assert.equal(
    videoKeyMatchesContentId("reel-abc-Title-Creator", "abc"),
    true
  );
  assert.equal(
    videoKeyMatchesContentId("reel-other-Title-Creator", "abc"),
    false
  );
});
