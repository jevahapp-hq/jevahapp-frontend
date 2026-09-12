import assert from "node:assert/strict";
import { test } from "node:test";
import { cycleRepeatOne, pickNextPlayableIndex } from "./queueAdvance";

test("repeat button toggles off and loop-one", () => {
  assert.equal(cycleRepeatOne("none"), "one");
  assert.equal(cycleRepeatOne("one"), "none");
  assert.equal(cycleRepeatOne("all"), "one");
});

test("natural end with repeat off plays the following track", () => {
  assert.equal(
    pickNextPlayableIndex({
      length: 3,
      currentIndex: 0,
      repeatMode: "none",
    }),
    1
  );
  assert.equal(
    pickNextPlayableIndex({
      length: 3,
      currentIndex: 2,
      repeatMode: "none",
    }),
    -1
  );
});

test("natural end with repeat one restarts the same index", () => {
  assert.equal(
    pickNextPlayableIndex({
      length: 3,
      currentIndex: 1,
      repeatMode: "one",
    }),
    1
  );
});

test("skip-forward still leaves a repeated track", () => {
  assert.equal(
    pickNextPlayableIndex({
      length: 3,
      currentIndex: 1,
      repeatMode: "one",
      fromUser: true,
    }),
    2
  );
});

test("repeat all wraps to the first playable track", () => {
  assert.equal(
    pickNextPlayableIndex({
      length: 3,
      currentIndex: 2,
      repeatMode: "all",
    }),
    0
  );
});
