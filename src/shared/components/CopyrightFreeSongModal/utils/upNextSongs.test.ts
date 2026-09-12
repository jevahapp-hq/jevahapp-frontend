import assert from "node:assert/strict";
import { test } from "node:test";
import { durationSeconds, songKey, upNextSongs } from "./upNextSongs";

test("upNextSongs lists everything after the current track, then wraps", () => {
  const songs = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  assert.deepEqual(
    upNextSongs(songs, { id: "b" }).map((s) => s.id),
    ["c", "d", "a"]
  );
});

test("upNextSongs drops the current song when it is not in the list", () => {
  const songs = [{ id: "a" }, { _id: "b" }];
  assert.deepEqual(
    upNextSongs(songs, { id: "missing" }).map(songKey),
    ["a", "b"]
  );
});

test("durationSeconds treats millisecond values as ms", () => {
  assert.equal(durationSeconds(90), 90);
  assert.equal(durationSeconds(90000), 90);
  assert.equal(durationSeconds(0), 0);
});
