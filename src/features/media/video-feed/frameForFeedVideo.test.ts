import assert from "node:assert/strict";
import test from "node:test";
import { FEED_VIDEO_PLAYER_HEIGHT } from "./feedVideoConfig.ts";
import { frameForFeedVideo, isNineSixteenAspect } from "./frameForFeedVideo.ts";

test("wide videos fill the card width and height", () => {
  const frame = frameForFeedVideo(16 / 9, 390);
  assert.equal(frame.portrait, false);
  assert.equal(frame.width, 390);
  assert.equal(frame.height, FEED_VIDEO_PLAYER_HEIGHT);
});

test("square videos also cover the full card", () => {
  const frame = frameForFeedVideo(1, 390);
  assert.equal(frame.portrait, false);
  assert.equal(frame.width, 390);
  assert.equal(frame.height, FEED_VIDEO_PLAYER_HEIGHT);
});

test("9:16 is recognized and nearby ratios are not", () => {
  assert.equal(isNineSixteenAspect(9 / 16), true);
  assert.equal(isNineSixteenAspect(9 / 16 * 1.04), true);
  assert.equal(isNineSixteenAspect(1), false);
  assert.equal(isNineSixteenAspect(16 / 9), false);
  assert.equal(isNineSixteenAspect(null), false);
});

test("an unknown ratio covers the full card", () => {
  const frame = frameForFeedVideo(null, 390);
  assert.equal(frame.portrait, false);
  assert.equal(frame.height, FEED_VIDEO_PLAYER_HEIGHT);
  assert.equal(frame.width, 390);
});

test("9:16 stays full height and narrower than the card", () => {
  const frame = frameForFeedVideo(9 / 16, 390);
  assert.equal(frame.portrait, true);
  assert.equal(frame.height, FEED_VIDEO_PLAYER_HEIGHT);
  assert.ok(frame.width < 390);
  assert.equal(frame.width, Math.round(FEED_VIDEO_PLAYER_HEIGHT * (9 / 16)));
});

test("a portrait clip that is not 9:16 still covers the card", () => {
  const frame = frameForFeedVideo(4 / 5, 390);
  assert.equal(frame.portrait, false);
  assert.equal(frame.width, 390);
  assert.equal(frame.height, FEED_VIDEO_PLAYER_HEIGHT);
});
