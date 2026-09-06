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
  assert.equal(useReelsStore.getState().resumePlayback, null);
});

test("tiny positions are cleared without applying", () => {
  useReelsStore.setState({
    resumePlayback: {
      contentId: "x",
      positionMs: 100,
      target: "feed",
    },
  });
  assert.equal(useReelsStore.getState().consumeResumePlayback("x", "feed"), null);
  assert.equal(useReelsStore.getState().resumePlayback, null);
});
