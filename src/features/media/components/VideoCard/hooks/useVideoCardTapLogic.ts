/**
 * useVideoCardTapLogic - Single/double tap detection and play toggle
 */
import { useCallback, useRef } from "react";
import type { MediaItem } from "../../../../shared/types";

export interface UseVideoCardTapLogicParams {
  key: string;
  video: MediaItem;
  index: number;
  isPlaying: boolean;
  isAudioSermon: boolean;
  audioIsPlaying: boolean;
  onTogglePlay: (key: string) => void;
  onVideoTap: (key: string, video: MediaItem, index: number) => void;
  audioControlsPause: () => void;
  togglePlayback: () => void;
  player: any;
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
  audioControlsPause,
  togglePlayback,
  player,
  showOverlayPermanently,
  hideOverlay,
}: UseVideoCardTapLogicParams) {
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  const toggleProcessingRef = useRef(false);

  const handleVideoTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    const isCurrentlyPlaying = isPlaying || (isAudioSermon && audioIsPlaying);

    if (timeSinceLastTap > 400) tapCountRef.current = 0;
    tapCountRef.current += 1;
    lastTapRef.current = now;

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (tapCountRef.current === 2 && timeSinceLastTap <= 400) {
      tapCountRef.current = 0;
      if (isCurrentlyPlaying) {
        if (isAudioSermon) audioControlsPause();
        else {
          togglePlayback();
          if (player) {
            try {
              player.pause();
            } catch (error) {
              console.error("❌ Pause failed:", error);
            }
          }
        }
      }
      onVideoTap(key, video, index);
      return;
    }

    tapTimeoutRef.current = setTimeout(() => {
      if (tapCountRef.current === 1) onTogglePlay(key);
      tapCountRef.current = 0;
      tapTimeoutRef.current = null;
    }, 200) as any;
  }, [
    isPlaying,
    onTogglePlay,
    key,
    onVideoTap,
    video,
    index,
    isAudioSermon,
    audioControlsPause,
    audioIsPlaying,
    togglePlayback,
    player,
  ]);

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
