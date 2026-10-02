import assert from "node:assert/strict";
import test from "node:test";
import {
  thumbnailCropRect,
  thumbnailMatchesAspect,
  thumbnailPreviewRatio,
} from "./thumbnailAspect.ts";

test("preview ratios match 1:1, 9:16, and 16:9", () => {
  assert.equal(thumbnailPreviewRatio("1:1"), 1);
  assert.ok(Math.abs(thumbnailPreviewRatio("9:16") - 9 / 16) < 0.0001);
  assert.ok(Math.abs(thumbnailPreviewRatio("16:9") - 16 / 9) < 0.0001);
});

test("a portrait crop is accepted and a square crop is not a 9:16", () => {
  assert.equal(thumbnailMatchesAspect(1080, 1920, "9:16"), true);
  assert.equal(thumbnailMatchesAspect(1080, 1080, "9:16"), false);
  assert.equal(thumbnailMatchesAspect(1920, 1080, "16:9"), true);
  assert.equal(thumbnailMatchesAspect(1000, 1000, "1:1"), true);
});

test("a landscape photo is center-cropped to 9:16", () => {
  const rect = thumbnailCropRect(1920, 1080, "9:16");
  assert.ok(rect);
  assert.equal(rect.originY, 0);
  assert.ok(rect.width < 1920);
  assert.equal(rect.height, 1080);
  assert.ok(Math.abs(rect.width / rect.height - 9 / 16) < 0.02);
});

test("a missing size is left to the picker crop", () => {
  assert.equal(thumbnailMatchesAspect(undefined, undefined, "16:9"), true);
  assert.equal(thumbnailMatchesAspect(0, 1080, "16:9"), false);
});
