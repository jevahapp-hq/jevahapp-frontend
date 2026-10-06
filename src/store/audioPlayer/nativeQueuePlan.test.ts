import assert from "node:assert/strict";
import { test } from "node:test";
import { playlistLoopForRepeat, queueIdentity } from "./nativeQueuePlan";

test("repeat modes map onto the native playlist loop", () => {
  assert.equal(playlistLoopForRepeat("none"), "none");
  assert.equal(playlistLoopForRepeat("one"), "single");
  assert.equal(playlistLoopForRepeat("all"), "all");
  assert.equal(playlistLoopForRepeat(undefined), "none");
});

test("queue identity changes when order or membership changes", () => {
  assert.equal(queueIdentity([{ id: "a" }, { id: "b" }]), "a\0b");
  assert.notEqual(
    queueIdentity([{ id: "a" }, { id: "b" }]),
    queueIdentity([{ id: "b" }, { id: "a" }])
  );
});
