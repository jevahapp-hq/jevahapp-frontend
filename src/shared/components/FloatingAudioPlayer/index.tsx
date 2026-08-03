import React from "react";
import CopyrightFreeSongModal from "../../../../app/components/CopyrightFreeSongModal";
import { useGlobalAudioPlayerStore } from "../../../../app/store/useGlobalAudioPlayerStore";
import { FloatingMiniBar } from "./FloatingMiniBar";
import { useFloatingPlayerActions } from "./useFloatingPlayerActions";
import { useFloatingPlayerVisibility } from "./useFloatingPlayerVisibility";

export default function FloatingAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    position,
    duration,
    progress,
    togglePlayPause,
    seekToProgress,
    toggleMute,
    isMuted,
    stop,
    next,
    previous,
    clear,
  } = useGlobalAudioPlayerStore();

  const { shouldShowPlayer, fadeAnim, slideAnim } =
    useFloatingPlayerVisibility({ currentTrack, stop });

  const {
    showFullPlayer,
    setShowFullPlayer,
    handleCloseMini,
    formatTime,
    dragY,
    panResponder,
  } = useFloatingPlayerActions({ clear });

  // Don't render if user not authenticated or on auth screens
  if (!shouldShowPlayer) {
    return null;
  }

  // Don't render if no track is loaded
  if (!currentTrack) {
    return null;
  }

  return (
    <>
      <FloatingMiniBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        dragY={dragY}
        panHandlers={panResponder.panHandlers}
        onOpenFullPlayer={() => setShowFullPlayer(true)}
        onPrevious={previous}
        onTogglePlayPause={togglePlayPause}
        onNext={next}
        onClose={handleCloseMini}
      />

      <CopyrightFreeSongModal
        visible={showFullPlayer}
        song={currentTrack}
        onClose={() => setShowFullPlayer(false)}
        onPlay={togglePlayPause}
        isPlaying={isPlaying}
        audioProgress={progress}
        audioDuration={duration}
        audioPosition={position}
        isMuted={isMuted}
        onTogglePlay={togglePlayPause}
        onToggleMute={toggleMute}
        onSeek={seekToProgress}
        formatTime={formatTime}
      />
    </>
  );
}
