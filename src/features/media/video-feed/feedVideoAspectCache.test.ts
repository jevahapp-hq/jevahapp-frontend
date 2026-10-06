import assert from "node:assert/strict";
import test from "node:test";
import {
  noteTrackAspect,
  peekFeedVideoAspect,
  rememberFeedVideoAspect,
  resetFeedVideoAspectForTests,
} from "./feedVideoAspectCache.ts";

test("an upload probe trusts a wide picture and a tall one", () => {
  resetFeedVideoAspectForTests();
  rememberFeedVideoAspect("https://cdn.example/wide.mp4", 16 / 9);
  rememberFeedVideoAspect("https://cdn.example/tall.mp4?token=1", 9 / 16);
  assert.equal(peekFeedVideoAspect("https://cdn.example/wide.mp4"), 16 / 9);
  assert.equal(
    peekFeedVideoAspect("https://cdn.example/tall.mp4"),
    9 / 16
  );
});

test("a wide track is ignored and cannot undo a 9:16 probe", () => {
  resetFeedVideoAspectForTests();
  const url = "https://cdn.example/clip.mp4";
  noteTrackAspect(url, 16 / 9);
  assert.equal(peekFeedVideoAspect(url), null);
  rememberFeedVideoAspect(url, 9 / 16);
  noteTrackAspect(url, 16 / 9);
  rememberFeedVideoAspect(url, 16 / 9);
  assert.equal(peekFeedVideoAspect(url), 9 / 16);
});
