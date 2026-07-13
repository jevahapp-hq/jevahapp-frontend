/**
 * useVideoCardSeek - Seek handlers for video and audio
 */
import React, { useCallback } from "react";

export interface UseVideoCardSeekParams {
  isAudioSermon: boolean;
  audioState?: { position: number; duration: number };
  audioControls?: { seekTo: (ms: number) => Promise<void> };
  videoRef: React.MutableRefObject<any>;
  videoPositionMs: number;
  lastKnownDurationRef: React.MutableRefObject<number>;
  backendDurationMs: number;
}

export function useVideoCardSeek({
  isAudioSermon,
  audioState,
  audioControls,
  videoRef,
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
      } else {
        const durationMs = lastKnownDurationRef.current || backendDurationMs || 0;
        if (!videoRef.current || durationMs <= 0) return;
        const currentMs = Math.max(0, Math.min(videoPositionMs, durationMs));
        const nextMs = Math.max(0, Math.min(currentMs + deltaSec * 1000, durationMs));
        try {
          await videoRef.current.setPositionAsync(nextMs);
        } catch (e) {
          console.warn("Video seekBySeconds failed", e);
        }
      }
    },
    [
      isAudioSermon,
      audioState?.position,
      audioState?.duration,
      audioControls,
      videoRef,
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
      } else {
        const durationMs = lastKnownDurationRef.current || 0;
        if (!videoRef.current || durationMs <= 0) return;
        const clamped = Math.max(0, Math.min(percent, 1));
        try {
          await videoRef.current.setPositionAsync(clamped * durationMs);
        } catch (e) {
          console.warn("Video seekToPercent failed", e);
        }
      }
    },
    [isAudioSermon, audioState?.duration, audioControls, videoRef, lastKnownDurationRef]
  );

  return { seekBySeconds, seekToPercent };
}
