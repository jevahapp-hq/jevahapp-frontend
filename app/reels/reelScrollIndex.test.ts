import assert from "node:assert/strict";
import test from "node:test";
import { reelIndexForScroll, reelVideoKey } from "./reelScrollIndex.ts";

test("player keys follow the media id, not the title", () => {
  assert.equal(
    reelVideoKey({ _id: "abc", title: "One" } as { _id: string }, 3),
    "reel-abc"
  );
  assert.equal(reelVideoKey({ title: "One" }, 3), "reel-index-3");
});

const cellHeight = 800;

test("a small downward move leaves the current reel immediately", () => {
  assert.equal(
    reelIndexForScroll({
      offsetY: 40,
      cellHeight,
      previousOffsetY: 0,
      count: 4,
    }),
    1
  );
  assert.equal(
    reelIndexForScroll({
      offsetY: 20,
      cellHeight,
      previousOffsetY: 0,
      count: 4,
    }),
    0
  );
});

test("a small upward move leaves the current reel immediately", () => {
  assert.equal(
    reelIndexForScroll({
      offsetY: 760,
      cellHeight,
      previousOffsetY: 800,
      count: 4,
    }),
    0
  );
  assert.equal(
    reelIndexForScroll({
      offsetY: 800,
      cellHeight,
      previousOffsetY: 840,
      count: 4,
    }),
    1
  );
});

test("audio waits until the next reel is the one on screen", () => {
  assert.equal(
    reelIndexForScroll({
      offsetY: 80,
      cellHeight,
      previousOffsetY: 0,
      count: 4,
      lead: 0.5,
    }),
    0
  );
  assert.equal(
    reelIndexForScroll({
      offsetY: 400,
      cellHeight,
      previousOffsetY: 0,
      count: 4,
      lead: 0.5,
    }),
    1
  );
});

test("a resting offset stays on the snapped reel", () => {
  assert.equal(
    reelIndexForScroll({
      offsetY: 800,
      cellHeight,
      previousOffsetY: 800,
      count: 4,
    }),
    1
  );
});
