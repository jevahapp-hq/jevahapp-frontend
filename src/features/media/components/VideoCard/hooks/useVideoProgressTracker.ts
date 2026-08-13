/**
 * Progress + duration for feed video scrubber.
 *
 * Duration sources (priority):
 *   1. Confirmed player.duration / sourceLoad
 *   2. Session cache for this media id
 *   3. Backend media.duration seed
 *
 * Never use bufferedPosition as "duration" for looping (that snapped seeks to 0).
 * Loop only via playToEnd.
 */
import { useEffect, useRef, useState } from "react";
import {
  durationMsFromPayload,
  getPlayerDurationMs,
  getPlayerPositionMs,
} from "../player/expoVideoAdapter";
import {
  getCachedDurationMs,
  setCachedDurationMs,
} from "../player/durationCache";

export interface UseVideoProgressTrackerParams {
  player: any;
  enabled: boolean;
  mediaId?: string;
  updateIntervalSec?: number;
  isMountedRef: React.MutableRefObject<boolean>;
  suppressAutoLoopRef?: React.MutableRefObject<boolean>;
  initialDurationMs?: number;
  onTick?: (positionMs: number, durationMs: number, progress: number) => void;
  onReady?: (durationMs: number) => void;
  onError?: (error: any) => void;
}

function commitDuration(
  durationMs: number,
  mediaId: string | undefined,
  lastKnownDurationRef: React.MutableRefObject<number>,
  setVideoDurationMs: (ms: number) => void,
  onReady?: (durationMs: number) => void
): boolean {
  if (!Number.isFinite(durationMs) || durationMs < 500) return false;
  if (Math.abs(lastKnownDurationRef.current - durationMs) < 40) {
    setCachedDurationMs(mediaId, durationMs);
    return true;
  }
  // Don't shrink a good known duration with a worse reading
  if (
    lastKnownDurationRef.current >= 500 &&
    durationMs < lastKnownDurationRef.current * 0.5
  ) {
    return false;
  }
  lastKnownDurationRef.current = durationMs;
  setVideoDurationMs(durationMs);
  setCachedDurationMs(mediaId, durationMs);
  onReady?.(durationMs);
  return true;
}

export function useVideoProgressTracker({
  player,
  enabled,
  mediaId,
  updateIntervalSec = 0.1,
  isMountedRef,
  suppressAutoLoopRef,
  initialDurationMs = 0,
  onTick,
  onReady,
  onError,
}: UseVideoProgressTrackerParams) {
  const seed = Math.max(
    initialDurationMs >= 500 ? initialDurationMs : 0,
    getCachedDurationMs(mediaId)
  );

  const lastKnownDurationRef = useRef(seed);
  const [videoDurationMs, setVideoDurationMs] = useState(seed);
  const [videoPositionMs, setVideoPositionMs] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const onReadyRef = useRef(onReady);
  const onTickRef = useRef(onTick);
  const onErrorRef = useRef(onError);
  onReadyRef.current = onReady;
  onTickRef.current = onTick;
  onErrorRef.current = onError;

  useEffect(() => {
    const next = Math.max(
      initialDurationMs >= 500 ? initialDurationMs : 0,
      getCachedDurationMs(mediaId)
    );
    if (next >= 500) {
      commitDuration(
        next,
        mediaId,
        lastKnownDurationRef,
        setVideoDurationMs,
        onReadyRef.current
      );
    }
  }, [initialDurationMs, mediaId]);

  useEffect(() => {
    if (!player || !enabled) return;

    try {
      player.timeUpdateEventInterval = updateIntervalSec;
    } catch {
      // no-op
    }

    const captureFromPlayer = () => {
      const ms = getPlayerDurationMs(player, 0);
      return commitDuration(
        ms,
        mediaId,
        lastKnownDurationRef,
        setVideoDurationMs,
        onReadyRef.current
      );
    };

    captureFromPlayer();
    const pollId = setInterval(() => {
      if (!isMountedRef.current) return;
      captureFromPlayer();
      // Keep polling a bit even after first hit — some devices refine duration
    }, 400);
    const pollStop = setTimeout(() => clearInterval(pollId), 15000);

    const statusSubscription = player.addListener?.(
      "statusChange",
      (status: any) => {
        if (status?.status === "readyToPlay") {
          captureFromPlayer();
          setTimeout(() => isMountedRef.current && captureFromPlayer(), 150);
          setTimeout(() => isMountedRef.current && captureFromPlayer(), 600);
          setTimeout(() => isMountedRef.current && captureFromPlayer(), 1500);
        } else if (status?.status === "error") {
          onErrorRef.current?.(status);
        }
      }
    );

    const sourceSubscription = player.addListener?.(
      "sourceLoad",
      (payload: any) => {
        const ms = durationMsFromPayload(payload, player);
        if (
          !commitDuration(
            ms,
            mediaId,
            lastKnownDurationRef,
            setVideoDurationMs,
            onReadyRef.current
          )
        ) {
          captureFromPlayer();
        }
      }
    );

    const playingSubscription = player.addListener?.("playingChange", () => {
      captureFromPlayer();
    });

    const endSubscription = player.addListener?.("playToEnd", () => {
      if (suppressAutoLoopRef?.current) {
        try {
          player.pause();
        } catch {
          // no-op
        }
        return;
      }
      const pos = getPlayerPositionMs(player);
      if (pos >= 500) {
        commitDuration(
          Math.max(pos, lastKnownDurationRef.current),
          mediaId,
          lastKnownDurationRef,
          setVideoDurationMs,
          onReadyRef.current
        );
      }
      try {
        player.currentTime = 0;
        player.play();
      } catch {
        // no-op
      }
    });

    const timeUpdateSubscription = player.addListener?.(
      "timeUpdate",
      (event: any) => {
        if (!isMountedRef.current) return;

        const currentTime =
          typeof event?.currentTime === "number"
            ? event.currentTime
            : getPlayerPositionMs(player) / 1000;

        const fromPlayer = getPlayerDurationMs(player, 0);
        if (fromPlayer >= 500) {
          commitDuration(
            fromPlayer,
            mediaId,
            lastKnownDurationRef,
            setVideoDurationMs,
            onReadyRef.current
          );
        }

        const durationMs = lastKnownDurationRef.current || fromPlayer || 0;
        const positionMs = Math.max(0, currentTime * 1000);
        const progress =
          durationMs > 0
            ? Math.max(0, Math.min(1, positionMs / durationMs))
            : 0;

        setVideoPositionMs(positionMs);
        setVideoProgress(progress);
        onTickRef.current?.(positionMs, durationMs, progress);
      }
    );

    return () => {
      clearInterval(pollId);
      clearTimeout(pollStop);
      statusSubscription?.remove?.();
      sourceSubscription?.remove?.();
      playingSubscription?.remove?.();
      endSubscription?.remove?.();
      timeUpdateSubscription?.remove?.();
    };
  }, [
    player,
    enabled,
    mediaId,
    updateIntervalSec,
    isMountedRef,
    suppressAutoLoopRef,
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
