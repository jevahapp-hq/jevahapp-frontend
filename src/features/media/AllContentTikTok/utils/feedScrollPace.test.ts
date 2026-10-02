import assert from "node:assert/strict";
import { test } from "node:test";
import {
  scrollSpeedIsFast,
  shouldResumeVisibleVideoAfterScroll,
} from "./feedScrollPace";

test("a flick is a fast feed scroll", () => {
  assert.equal(scrollSpeedIsFast(400, 100), true);
});

test("a slow drag is not a fast feed scroll", () => {
  assert.equal(scrollSpeedIsFast(40, 100), false);
  assert.equal(scrollSpeedIsFast(0, 0), false);
});

test("a flick pause on the same video resumes when the scroll stops", () => {
  assert.equal(
    shouldResumeVisibleVideoAfterScroll({
      autoPlay: true,
      feedActive: true,
      commentsOpen: false,
      visibleKey: "clip-1",
      visibleIsVideo: true,
      isPlaying: false,
    }),
    true
  );
  assert.equal(
    shouldResumeVisibleVideoAfterScroll({
      autoPlay: true,
      feedActive: true,
      commentsOpen: false,
      visibleKey: "clip-1",
      visibleIsVideo: true,
      isPlaying: true,
    }),
    false
  );
});
