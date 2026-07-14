/**
 * Hold the scrubber at the seek target until the player catches up (or timeout).
 */
import { useEffect } from "react";
import type { ProgressBarConfig } from "./types";
import {
  calculateProgress,
  calculateSeekEpsilon,
  debugLog,
  isProgressCloseEnough,
} from "./utils";

export const useSeekSync = (
  currentMs: number,
  durationMs: number,
  isSeeking: boolean,
  targetProgress: number | null,
  stableTicks: number,
  config: ProgressBarConfig,
  onSeekComplete: () => void,
  onStableTickUpdate: (ticks: number) => void,
  debug: boolean = false,
  seekAbortMs: number = 900
) => {
  useEffect(() => {
    if (!isSeeking || targetProgress === null) {
      if (stableTicks > 0) onStableTickUpdate(0);
      return;
    }

    const abortTimer = setTimeout(() => {
      debugLog(
        "Seek aborted (timeout)",
        { targetProgress, seekAbortMs },
        debug
      );
      onSeekComplete();
    }, seekAbortMs);

    const externalProgress = calculateProgress(currentMs, durationMs);
    const epsilon = calculateSeekEpsilon(
      durationMs,
      config.seekMsTolerance,
      config.minProgressEpsilon
    );
    const closeEnough = isProgressCloseEnough(
      externalProgress,
      targetProgress,
      epsilon
    );

    debugLog(
      "Seek sync check",
      { externalProgress, targetProgress, epsilon, closeEnough, stableTicks },
      debug
    );

    if (closeEnough) {
      const newStableTicks = stableTicks + 1;
      onStableTickUpdate(newStableTicks);
      if (newStableTicks >= config.seekSyncTicks) {
        clearTimeout(abortTimer);
        debugLog(
          "Seek completed",
          { targetProgress, externalProgress },
          debug
        );
        onSeekComplete();
      }
    } else if (stableTicks > 0) {
      onStableTickUpdate(0);
    }

    return () => clearTimeout(abortTimer);
  }, [
    currentMs,
    durationMs,
    isSeeking,
    targetProgress,
    stableTicks,
    config,
    onSeekComplete,
    onStableTickUpdate,
    debug,
    seekAbortMs,
  ]);
};
