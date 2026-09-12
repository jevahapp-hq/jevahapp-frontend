import assert from "node:assert/strict";
import { test } from "node:test";
import { useReelsStore } from "./useReelsStore";

test("resume targets gate feed vs reels consumption", () => {
  useReelsStore.setState({
    resumePlayback: {
      contentId: "abc",
      positionMs: 5000,
      feedKey: "Home::abc",
      target: "reels",
    },
  });

  assert.equal(useReelsStore.getState().consumeResumePlayback("abc", "feed"), null);
  assert.equal(useReelsStore.getState().resumePlayback?.target, "reels");

  useReelsStore.getState().setResumePlayback({
    contentId: "abc",
    positionMs: 5200,
    feedKey: "Home::abc",
    target: "feed",
  });

  const consumed = useReelsStore.getState().consumeResumePlayback("abc", "feed");
  assert.equal(consumed?.positionMs, 5200);
  assert.equal(useReelsStore.getState().resumePlayback?.feedKey, "Home::abc");
  assert.equal(useReelsStore.getState().resumePlayback?.positionMs, 0);
});

test("tiny positions do not apply seek and keep feedKey", () => {
  useReelsStore.setState({
    resumePlayback: {
      contentId: "x",
      positionMs: 100,
      feedKey: "ALL::x",
      target: "feed",
    },
  });
  assert.equal(useReelsStore.getState().consumeResumePlayback("x", "feed"), null);
  assert.equal(useReelsStore.getState().resumePlayback?.feedKey, "ALL::x");
});

test("reelsIndex stays on resume so fullscreen exit can restore the same row", () => {
  useReelsStore.getState().setResumePlayback({
    contentId: "ccc",
    positionMs: 1200,
    feedKey: "videos::ccc",
    reelsIndex: 4,
    target: "feed",
  });
  assert.equal(useReelsStore.getState().resumePlayback?.reelsIndex, 4);
  assert.equal(useReelsStore.getState().resumePlayback?.feedKey, "videos::ccc");
});
