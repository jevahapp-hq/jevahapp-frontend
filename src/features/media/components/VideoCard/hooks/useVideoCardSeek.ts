/**
 * useVideoCardSeek - Seek for expo-video (primary) with expo-av fallback
 */
import React, { useCallback } from "react";
import { seekPlayerBySeconds, seekPlayerToMs } from "../player/expoVideoAdapter";

export interface UseVideoCardSeekParams {
  isAudioSermon: boolean;
  audioState?: { position: number; duration: number };
  audioControls?: { seekTo: (ms: number) => Promise<void> };
  player: any;
  videoPositionMs: number;
  lastKnownDurationRef: React.MutableRefObject<number>;
  backendDurationMs: number;
}

export function useVideoCardSeek({
  isAudioSermon,
  audioState,
  audioControls,
  player,
  videoPositionMs,
  lastKnownDurationRef,
  backendDurationMs,
}: UseVideoCardSeekParams) {
  const seekBySeconds = useCallback(
    async (deltaSec: number) => {
      if (isAudioSermon) {
        const duration = audioState?.duration ?? 0;
        if (duration <= 0 || !audioControls) return;
        const nextMs = Math.max(
          0,
          Math.min((audioState?.position ?? 0) + deltaSec * 1000, duration)
        );
        try {
          await audioControls.seekTo(nextMs);
        } catch (e) {
          console.warn("Audio seekBySeconds failed", e);
        }
        return;
      }

      const durationMs = lastKnownDurationRef.current || backendDurationMs || 0;
      await seekPlayerBySeconds(player, deltaSec, videoPositionMs, durationMs);
    },
    [
      isAudioSermon,
      audioState?.position,
      audioState?.duration,
      audioControls,
      player,
      videoPositionMs,
      backendDurationMs,
      lastKnownDurationRef,
    ]
  );

  const seekToPercent = useCallback(
    async (percent: number) => {
      if (isAudioSermon) {
        const duration = audioState?.duration ?? 0;
        if (duration <= 0 || !audioControls) return;
        const clamped = Math.max(0, Math.min(percent, 1));
        try {
          await audioControls.seekTo(clamped * duration);
        } catch (e) {
          console.warn("Audio seekToPercent failed", e);
        }
        return;
      }

      const durationMs = lastKnownDurationRef.current || backendDurationMs || 0;
      if (!player || durationMs <= 0) return;
      const clamped = Math.max(0, Math.min(percent, 1));
      const ok = await seekPlayerToMs(player, clamped * durationMs);
      if (!ok && __DEV__) {
        console.warn("Video seekToPercent: player did not seek (check expo-video adapter)");
      }
    },
    [
      isAudioSermon,
      audioState?.duration,
      audioControls,
      player,
      lastKnownDurationRef,
      backendDurationMs,
    ]
  );

  return { seekBySeconds, seekToPercent };
}
