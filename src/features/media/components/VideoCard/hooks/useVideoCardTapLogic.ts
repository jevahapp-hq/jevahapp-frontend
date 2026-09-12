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
    tapCountRef.current = 0;
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }
    onTogglePlay(key);
  }, [onTogglePlay, key]);

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
