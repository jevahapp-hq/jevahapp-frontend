export const PLAYBACK_TICK_INTERVAL_MS = 250;
export const PLAYBACK_POSITION_COMMIT_MS = 150;
export const PLAYBACK_PROGRESS_COMMIT = 0.005;
export const PLAYBACK_POSITION_FORCE_MS = 400;

export type PlaybackTickDecision = {
  commitPosition: boolean;
  playingChanged: boolean;
  durationChanged: boolean;
};

/**
 * Decide what a native `playbackStatusUpdate` may write.
 * Position commits go to the playback clock; playing/duration go to the session store.
 */
export function decidePlaybackTick(input: {
  now: number;
  lastCommitTs: number;
  prevPosition: number;
  nextPosition: number;
  prevProgress: number;
  nextProgress: number;
  prevPlaying: boolean;
  nextPlaying: boolean;
  prevDuration: number;
  nextDuration: number;
}): PlaybackTickDecision {
  const playingChanged = input.prevPlaying !== input.nextPlaying;
  const durationChanged =
    input.nextDuration > 0 && input.prevDuration !== input.nextDuration;
  const elapsed = input.now - input.lastCommitTs;
  const jumped =
    Math.abs(input.prevPosition - input.nextPosition) > PLAYBACK_POSITION_FORCE_MS;
  const shouldConsiderPosition =
    elapsed > PLAYBACK_TICK_INTERVAL_MS || jumped;
  const commitPosition =
    shouldConsiderPosition &&
    (Math.abs(input.prevPosition - input.nextPosition) >
      PLAYBACK_POSITION_COMMIT_MS ||
      Math.abs(input.prevProgress - input.nextProgress) >
        PLAYBACK_PROGRESS_COMMIT);

  return { commitPosition, playingChanged, durationChanged };
}
