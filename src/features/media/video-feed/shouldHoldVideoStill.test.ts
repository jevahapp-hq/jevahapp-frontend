import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldHoldVideoStill } from "./shouldHoldVideoStill";

test("holds the still until a native frame paints on an active surface", () => {
  assert.equal(
    shouldHoldVideoStill({
      nativeFirstFrame: false,
      isSurfaceActive: true,
    }),
    true
  );
  assert.equal(
    shouldHoldVideoStill({
      nativeFirstFrame: true,
      isSurfaceActive: true,
    }),
    false
  );
});

test("holds the still while the surface is paused, covered, or off-screen", () => {
  assert.equal(
    shouldHoldVideoStill({
      nativeFirstFrame: true,
      isSurfaceActive: false,
    }),
    true
  );
});

test("holds the still while a resume seek is still pending", () => {
  assert.equal(
    shouldHoldVideoStill({
      nativeFirstFrame: true,
      isSurfaceActive: true,
      pendingResumeSec: 12.5,
    }),
    true
  );
  assert.equal(
    shouldHoldVideoStill({
      nativeFirstFrame: true,
      isSurfaceActive: true,
      pendingResumeSec: 0.2,
    }),
    false
  );
});
