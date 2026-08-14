import React from "react";
import { useCopyrightFreeOverlayStore } from "../../../../app/store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "../../../../app/store/useGlobalAudioPlayerStore";
import { FloatingMiniBar } from "./FloatingMiniBar";
import { useFloatingPlayerActions } from "./useFloatingPlayerActions";
import { useFloatingPlayerVisibility } from "./useFloatingPlayerVisibility";

export default function FloatingAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    stop,
    next,
    previous,
    clear,
  } = useGlobalAudioPlayerStore();

  const { shouldShowPlayer, fadeAnim, slideAnim } =
    useFloatingPlayerVisibility({ currentTrack, stop });

  const { handleCloseMini, dragY, panResponder } = useFloatingPlayerActions({
    clear,
  });

  if (!shouldShowPlayer) {
    return null;
  }

  if (!currentTrack) {
    return null;
  }

  return (
    <FloatingMiniBar
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
      dragY={dragY}
      panHandlers={panResponder.panHandlers}
      onOpenFullPlayer={() => {
        useCopyrightFreeOverlayStore.getState().open(currentTrack);
      }}
      onPrevious={previous}
      onTogglePlayPause={togglePlayPause}
      onNext={next}
      onClose={handleCloseMini}
    />
  );
}
