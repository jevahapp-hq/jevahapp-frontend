/**
 * useVideoCardTapLogic - Single/double tap detection and play toggle
 */
import { useCallback, useRef } from "react";
import type { VideoPlayer } from "expo-video";
import type { MediaItem } from "../../../../../shared/types";

export interface UseVideoCardTapLogicParams {
  key: string;
  video: MediaItem;
  index: number;
  isPlaying: boolean;
  isAudioSermon: boolean;
  audioIsPlaying: boolean;
  onTogglePlay: (key: string) => void;
  onVideoTap: (key: string, video: MediaItem, index: number) => void;
  /** IG Reels: double-tap likes if needed and plays the burst. Does not unlike. */
  onDoubleTapLike?: () => void;
  audioControlsPause: () => void;
  togglePlayback: () => void;
  videoRef: React.MutableRefObject<VideoPlayer | null>;
  showOverlayPermanently: () => void;
  hideOverlay: () => void;
}

export function useVideoCardTapLogic({
  key,
  video,
  index,
  isPlaying,
  isAudioSermon,
  audioIsPlaying,
  onTogglePlay,
  onVideoTap,
  onDoubleTapLike,
  audioControlsPause,
  togglePlayback,
  videoRef,
  showOverlayPermanently,
  hideOverlay,
}: UseVideoCardTapLogicParams) {
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  const toggleProcessingRef = useRef(false);

  const handleVideoTap = useCallback(() => {
    const now = Date.now();
    const gap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (gap > 0 && gap <= 280) {
      tapCountRef.current = 0;
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      onDoubleTapLike?.();
      return;
    }

    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      tapTimeoutRef.current = null;
      onTogglePlay(key);
    }, 280);
  }, [onTogglePlay, key, onDoubleTapLike]);

  const handleTogglePlay = useCallback(
    (setIsPlayTogglePending: (v: boolean) => void) => {
      setIsPlayTogglePending(true);
      if (toggleProcessingRef.current) {
        setIsPlayTogglePending(false);
        return;
      }

      tapCountRef.current = 0;
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      toggleProcessingRef.current = true;

      try {
        onTogglePlay(key);
        if (isAudioSermon) {
          if (audioIsPlaying) showOverlayPermanently();
          else hideOverlay();
        } else {
          if (isPlaying) showOverlayPermanently();
          else hideOverlay();
        }
      } catch (error) {
        console.error("Error in handleTogglePlay:", error);
      } finally {
        setTimeout(() => {
          toggleProcessingRef.current = false;
          setIsPlayTogglePending(false);
        }, 50);
      }
    },
    [
      key,
      isAudioSermon,
      audioIsPlaying,
      isPlaying,
      onTogglePlay,
      showOverlayPermanently,
      hideOverlay,
    ]
  );

  return {
    handleVideoTap,
    handleTogglePlay,
    tapTimeoutRef,
  };
}
