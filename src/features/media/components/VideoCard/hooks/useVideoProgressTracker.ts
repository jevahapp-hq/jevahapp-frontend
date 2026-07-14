/**
 * Owns expo-video timeUpdate → ms progress for the scrubber.
 * Auto-loop is suppressed while scrubbing so seek isn't snapped back to 0.
 */
import { useEffect, useRef, useState } from "react";
import {
  getPlayerDurationMs,
  getPlayerPositionMs,
} from "../player/expoVideoAdapter";

export interface UseVideoProgressTrackerParams {
  player: any;
  enabled: boolean;
  updateIntervalSec?: number;
  isMountedRef: React.MutableRefObject<boolean>;
  /** While true, skip near-end auto-loop (set during drag/seek). */
  suppressAutoLoopRef?: React.MutableRefObject<boolean>;
  onTick?: (positionMs: number, durationMs: number, progress: number) => void;
  onReady?: (durationMs: number) => void;
  onError?: (error: any) => void;
}

export function useVideoProgressTracker({
  player,
  enabled,
  updateIntervalSec = 0.1,
  isMountedRef,
  suppressAutoLoopRef,
  onTick,
  onReady,
  onError,
}: UseVideoProgressTrackerParams) {
  const lastKnownDurationRef = useRef(0);
  const [videoDurationMs, setVideoDurationMs] = useState(0);
  const [videoPositionMs, setVideoPositionMs] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);

  useEffect(() => {
    if (!player || !enabled) return;

    try {
      if (typeof player.timeUpdateEventInterval === "number") {
        player.timeUpdateEventInterval = updateIntervalSec;
      }
    } catch {
      // no-op
    }

    const statusSubscription = player.addListener?.(
      "statusChange",
      (status: any) => {
        if (status.status === "readyToPlay") {
          const durationMs = getPlayerDurationMs(
            player,
            typeof status.duration === "number" ? status.duration * 1000 : 0
          );
          if (durationMs > 0) {
            lastKnownDurationRef.current = durationMs;
            setVideoDurationMs(durationMs);
            onReady?.(durationMs);
          }
        } else if (status.status === "error") {
          onError?.(status);
        }
      }
    );

    const timeUpdateSubscription = player.addListener?.(
      "timeUpdate",
      (event: any) => {
        if (!isMountedRef.current) return;

        const currentTime =
          typeof event?.currentTime === "number"
            ? event.currentTime
            : getPlayerPositionMs(player) / 1000;

        const rawDuration =
          typeof event?.duration === "number"
            ? event.duration
            : typeof player.duration === "number"
              ? player.duration
              : lastKnownDurationRef.current / 1000 || 0;

        const durationMs = Math.max(
          0,
          Math.min(rawDuration * 1000, 24 * 60 * 60 * 1000)
        );
        const positionMs = Math.max(
          0,
          Math.min(currentTime * 1000, durationMs || Infinity)
        );
        const progress =
          durationMs > 0
            ? Math.max(0, Math.min(1, positionMs / durationMs))
            : 0;

        if (Number.isFinite(durationMs) && durationMs > 0) {
          if (lastKnownDurationRef.current !== durationMs) {
            lastKnownDurationRef.current = durationMs;
            setVideoDurationMs(durationMs);
          }
        }

        setVideoPositionMs(positionMs);
        setVideoProgress(progress);
        onTick?.(positionMs, durationMs, progress);

        // Near-end loop — never during scrub/seek or the bar jumps to 0
        if (
          !suppressAutoLoopRef?.current &&
          rawDuration > 0 &&
          currentTime >= rawDuration - 0.25
        ) {
          try {
            player.currentTime = 0;
            if (player.playing) player.play();
          } catch {
            // no-op
          }
        }
      }
    );

    return () => {
      statusSubscription?.remove?.();
      timeUpdateSubscription?.remove?.();
    };
  }, [
    player,
    enabled,
    updateIntervalSec,
    isMountedRef,
    suppressAutoLoopRef,
    onTick,
    onReady,
    onError,
  ]);

  return {
    lastKnownDurationRef,
    videoDurationMs,
    videoPositionMs,
    videoProgress,
    setVideoPositionMs,
    setVideoProgress,
  };
}
