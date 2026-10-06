import assert from "node:assert/strict";
import test from "node:test";
import { reelResumeSeekSeconds } from "./reelPlayheadStore.ts";
import {
  nextScrollDirection,
  reelIndexForScroll,
  reelIndexWhileScrolling,
  reelVideoKey,
} from "./reelScrollIndex.ts";

test("the reel you scroll toward takes over as soon as it enters", () => {
  assert.equal(reelIndexWhileScrolling(0.01, 1, 5), 0);
  assert.equal(reelIndexWhileScrolling(0.05, 1, 5), 1);
  assert.equal(reelIndexWhileScrolling(0.1, 1, 5), 1);
  assert.equal(reelIndexWhileScrolling(2.99, -1, 5), 3);
  assert.equal(reelIndexWhileScrolling(2.9, -1, 5), 2);
});

test("resting on a page keeps that page whichever way you came", () => {
  assert.equal(reelIndexWhileScrolling(2, 1, 5), 2);
  assert.equal(reelIndexWhileScrolling(2, -1, 5), 2);
  assert.equal(reelIndexWhileScrolling(2.4, 0, 5), 2);
  assert.equal(reelIndexWhileScrolling(9, 1, 5), 4);
});

test("a small wobble against the swipe keeps the direction", () => {
  let state = { direction: 0, anchor: 0 };
  state = nextScrollDirection(state.direction, state.anchor, 20);
  assert.equal(state.direction, 1);
  state = nextScrollDirection(state.direction, state.anchor, 200);
  state = nextScrollDirection(state.direction, state.anchor, 192);
  assert.equal(state.direction, 1);
  assert.equal(state.anchor, 200);
  state = nextScrollDirection(state.direction, state.anchor, 180);
  assert.equal(state.direction, -1);
});

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

test("a mounted reel seeks only when the clip had finished", () => {
  assert.equal(reelResumeSeekSeconds(false), null);
  assert.equal(reelResumeSeekSeconds(true), 0.1);
});
