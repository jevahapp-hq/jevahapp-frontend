import assert from "node:assert/strict";
import { test } from "node:test";
import { decidePlaybackTick } from "./playbackStatusTick";

const base = {
  now: 1000,
  lastCommitTs: 1000,
  prevPosition: 0,
  nextPosition: 50,
  prevProgress: 0,
  nextProgress: 0.001,
  prevPlaying: true,
  nextPlaying: true,
  prevDuration: 60000,
  nextDuration: 60000,
};

test("drops sub-interval position noise so React is not scheduled", () => {
  const decision = decidePlaybackTick(base);
  assert.equal(decision.commitPosition, false);
  assert.equal(decision.playingChanged, false);
  assert.equal(decision.durationChanged, false);
});

test("commits position after the tick interval when it moved enough", () => {
  const decision = decidePlaybackTick({
    ...base,
    now: 1300,
    lastCommitTs: 1000,
    nextPosition: 400,
    nextProgress: 0.02,
  });
  assert.equal(decision.commitPosition, true);
});

test("play/pause is committed even when position is unchanged", () => {
  const decision = decidePlaybackTick({
    ...base,
    nextPlaying: false,
  });
  assert.equal(decision.playingChanged, true);
  assert.equal(decision.commitPosition, false);
});

test("duration is committed once when the engine reports it", () => {
  const decision = decidePlaybackTick({
    ...base,
    prevDuration: 0,
    nextDuration: 180000,
  });
  assert.equal(decision.durationChanged, true);
});

test("a seek-sized jump commits immediately", () => {
  const decision = decidePlaybackTick({
    ...base,
    now: 1010,
    lastCommitTs: 1000,
    prevPosition: 1000,
    nextPosition: 20000,
    prevProgress: 0.05,
    nextProgress: 0.33,
  });
  assert.equal(decision.commitPosition, true);
});
