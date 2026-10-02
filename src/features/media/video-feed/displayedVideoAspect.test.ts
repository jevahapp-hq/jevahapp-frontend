import assert from "node:assert/strict";
import test from "node:test";
import {
  aspectFromSize,
  aspectFromThumbnail,
  confirmedAspectFromTrack,
  frameAspectChanged,
} from "./displayedVideoAspect.ts";

test("a tall encoded track can be trusted", () => {
  assert.equal(confirmedAspectFromTrack(9 / 16), 9 / 16);
});

test("a wide encoded track is not trusted — iPhone often rotates it", () => {
  assert.equal(confirmedAspectFromTrack(16 / 9), null);
  assert.equal(confirmedAspectFromTrack(1), null);
  assert.equal(confirmedAspectFromTrack(null), null);
});

test("a thumbnail that fills both caps is not an aspect", () => {
  assert.equal(aspectFromThumbnail(96, 96, 96, 96), null);
  assert.equal(aspectFromThumbnail(54, 96, 96, 192), 54 / 96);
  assert.equal(aspectFromThumbnail(96, 54, 96, 192), 96 / 54);
});

test("a rotated frame's pixel size is the displayed aspect", () => {
  assert.equal(aspectFromSize(54, 96), 54 / 96);
  assert.ok((aspectFromSize(54, 96) ?? 1) < 1);
  assert.equal(aspectFromSize(0, 96), null);
});

test("the card updates only when tall and wide readings disagree", () => {
  assert.equal(frameAspectChanged(16 / 9, 9 / 16), true);
  assert.equal(frameAspectChanged(9 / 16, 3 / 4), false);
  assert.equal(frameAspectChanged(16 / 9, 4 / 3), false);
  assert.equal(frameAspectChanged(null, 9 / 16), false);
});
