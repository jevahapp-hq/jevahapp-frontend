import assert from "node:assert/strict";
import { test } from "node:test";
import {
  rememberSessionAudioQueue,
  resolvePlaybackQueue,
} from "./sessionAudioQueue";

const a = {
  id: "a",
  title: "A",
  artist: "x",
  audioUrl: "https://a",
  thumbnailUrl: "",
  duration: 1,
};
const b = {
  id: "b",
  title: "B",
  artist: "x",
  audioUrl: "https://b",
  thumbnailUrl: "",
  duration: 1,
};

test("explicit queue wins when it contains the track", () => {
  rememberSessionAudioQueue([a]);
  const queue = resolvePlaybackQueue(b, [a, b]);
  assert.deepEqual(
    queue.map((t) => t.id),
    ["a", "b"]
  );
});

test("remembered session queue is used when playing a track in it", () => {
  rememberSessionAudioQueue([a, b]);
  const queue = resolvePlaybackQueue(a);
  assert.deepEqual(
    queue.map((t) => t.id),
    ["a", "b"]
  );
});

test("unknown track falls back to a one-song queue", () => {
  rememberSessionAudioQueue([a]);
  const queue = resolvePlaybackQueue(b);
  assert.deepEqual(
    queue.map((t) => t.id),
    ["b"]
  );
});
