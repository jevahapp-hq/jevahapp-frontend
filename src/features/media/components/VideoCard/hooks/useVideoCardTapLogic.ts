/**
 * useVideoCardTapLogic — premium single/double tap for feed video cards.
 *
 * Product choice (Jevah):
 * - Double-tap → play / pause (decisive, haptic, store-driven)
 * - Single-tap → reveal controls overlay (never fights double-tap)
 * - Scan button remains the explicit expand / open affordance
 */
import { useCallback, useEffect, useRef } from "react";
import type { MediaItem } from "../../../../shared/types";
import { triggerMediaPlayHaptic } from "../../../../../shared/utils/haptics";
import {
  createMediaTapRecognizer,
  type MediaTapRecognizer,
} from "../gestures/createMediaTapRecognizer";

export interface UseVideoCardTapLogicParams {
  key: string;
  video: MediaItem;
  index: number;
  isPlaying: boolean;
  isAudioSermon: boolean;
  audioIsPlaying: boolean;
  onTogglePlay: (key: string) => void;
  audioControlsPause: () => void;
  audioControlsPlay?: () => void;
  togglePlayback: () => void;
  player: any;
  showOverlayPermanently: () => void;
  showOverlayTemporarily: () => void;
  hideOverlay: () => void;
}

export function useVideoCardTapLogic({
  key,
  isPlaying,
  isAudioSermon,
  audioIsPlaying,
  onTogglePlay,
  audioControlsPause,
  audioControlsPlay,
  showOverlayPermanently,
  showOverlayTemporarily,
  hideOverlay,
}: UseVideoCardTapLogicParams) {
  const toggleProcessingRef = useRef(false);
  const recognizerRef = useRef<MediaTapRecognizer | null>(null);

  const playbackRef = useRef({
    isPlaying,
    isAudioSermon,
    audioIsPlaying,
  });
  playbackRef.current = { isPlaying, isAudioSermon, audioIsPlaying };

  /**
   * One path for button + double-tap.
   * Feed store (`onTogglePlay`) is source of truth; player syncs via shouldPlay.
   */
  const togglePlayPause = useCallback(() => {
    const {
      isPlaying: playing,
      isAudioSermon: audio,
      audioIsPlaying: audioPlaying,
    } = playbackRef.current;
    const isCurrentlyPlaying = playing || (audio && audioPlaying);

    triggerMediaPlayHaptic();

    if (audio) {
      if (isCurrentlyPlaying) audioControlsPause();
      else audioControlsPlay?.();
    }

    onTogglePlay(key);

    if (isCurrentlyPlaying) showOverlayPermanently();
    else hideOverlay();
  }, [
    key,
    onTogglePlay,
    audioControlsPause,
    audioControlsPlay,
    showOverlayPermanently,
    hideOverlay,
  ]);

  const revealControls = useCallback(() => {
    const {
      isPlaying: playing,
      isAudioSermon: audio,
      audioIsPlaying: audioPlaying,
    } = playbackRef.current;
    const isCurrentlyPlaying = playing || (audio && audioPlaying);
    if (isCurrentlyPlaying) showOverlayTemporarily();
    else showOverlayPermanently();
  }, [showOverlayTemporarily, showOverlayPermanently]);

  useEffect(() => {
    recognizerRef.current = createMediaTapRecognizer({
      onSingleTap: revealControls,
      onDoubleTap: togglePlayPause,
    });
    return () => {
      recognizerRef.current?.dispose();
      recognizerRef.current = null;
    };
  }, [revealControls, togglePlayPause]);

  const handleVideoTap = useCallback(() => {
    recognizerRef.current?.onPress();
  }, []);

  const handleTogglePlay = useCallback(
    (setIsPlayTogglePending: (v: boolean) => void) => {
      setIsPlayTogglePending(true);
      if (toggleProcessingRef.current) {
        setIsPlayTogglePending(false);
        return;
      }

      recognizerRef.current?.reset();
      toggleProcessingRef.current = true;

      try {
        togglePlayPause();
      } catch (error) {
        console.error("Error in handleTogglePlay:", error);
      } finally {
        setTimeout(() => {
          toggleProcessingRef.current = false;
          setIsPlayTogglePending(false);
        }, 50);
      }
    },
    [togglePlayPause]
  );

  return {
    handleVideoTap,
    handleTogglePlay,
    tapTimeoutRef: { current: null } as React.MutableRefObject<ReturnType<
      typeof setTimeout
    > | null>,
  };
}
