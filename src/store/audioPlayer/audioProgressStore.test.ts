import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAudioPlaybackClock,
  getLastAudioProgressCommitTs,
  resetAudioPlaybackClock,
  writeAudioPlaybackClock,
} from "./audioProgressStore";

test("reset clears the clock for a new track", () => {
  resetAudioPlaybackClock("seed", 1);
  writeAudioPlaybackClock({
    trackId: "old",
    position: 8000,
    duration: 120000,
    progress: 0.4,
  });
  resetAudioPlaybackClock("next", 90000);
  const clock = getAudioPlaybackClock();
  assert.equal(clock.trackId, "next");
  assert.equal(clock.position, 0);
  assert.equal(clock.progress, 0);
  assert.equal(clock.duration, 90000);
  assert.equal(getLastAudioProgressCommitTs(), 0);
});

test("identical writes are no-ops", () => {
  resetAudioPlaybackClock("a", 1000);
  writeAudioPlaybackClock(
    { trackId: "a", position: 250, duration: 1000, progress: 0.25 },
    1000
  );
  const firstTs = getLastAudioProgressCommitTs();
  writeAudioPlaybackClock(
    { trackId: "a", position: 250, duration: 1000, progress: 0.25 },
    2000
  );
  assert.equal(getLastAudioProgressCommitTs(), firstTs);
  assert.equal(getAudioPlaybackClock().position, 250);
});

test("position ticks update the clock without requiring a session store", () => {
  resetAudioPlaybackClock("song-1", 60000);
  writeAudioPlaybackClock({
    trackId: "song-1",
    position: 1200,
    progress: 0.02,
    duration: 60000,
  });
  const clock = getAudioPlaybackClock();
  assert.equal(clock.trackId, "song-1");
  assert.equal(clock.position, 1200);
  assert.equal(clock.progress, 0.02);
});
