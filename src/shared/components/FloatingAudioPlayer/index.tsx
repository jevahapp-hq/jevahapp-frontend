import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { resolveFullPlayerTarget } from "@/shared/audio/audioSourcePolicy";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { useNotification } from "../../../../app/context/NotificationContext";
import { FloatingMiniBar } from "./FloatingMiniBar";
import { useFloatingPlayerActions } from "./useFloatingPlayerActions";
import { useFloatingPlayerVisibility } from "./useFloatingPlayerVisibility";

export default function FloatingAudioPlayer() {
  const currentTrack = useGlobalAudioPlayerStore((s) => s.currentTrack);
  const isPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const isLoading = useGlobalAudioPlayerStore((s) => s.isLoading);
  const progress = useGlobalAudioPlayerStore((s) => s.progress);
  const isSessionActive = useGlobalAudioPlayerStore((s) => s.isSessionActive);
  const loadError = useGlobalAudioPlayerStore((s) => s.loadError);
  const togglePlayPause = useGlobalAudioPlayerStore((s) => s.togglePlayPause);
  const next = useGlobalAudioPlayerStore((s) => s.next);
  const clear = useGlobalAudioPlayerStore((s) => s.clear);

  const { showNotification } = useNotification();
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loadError || loadError === lastErrorRef.current) return;
    lastErrorRef.current = loadError;
    showNotification({
      type: "warning",
      title: "Track unavailable",
      message: loadError,
      duration: 3500,
    });
  }, [loadError, showNotification]);

  const { shouldMountPlayer, overlayCovered } = useFloatingPlayerVisibility({
    currentTrack,
    isSessionActive,
  });

  const openFullPlayer = useMemo(() => {
    if (!currentTrack) return undefined;
    if (resolveFullPlayerTarget(currentTrack.source) === "none") {
      return undefined;
    }
    return () => {
      const overlay = useCopyrightFreeOverlayStore.getState();
      const id = currentTrack.id;
      const sameSong =
        overlay.song &&
        (overlay.song.id === id || overlay.song._id === id);
      if (sameSong) {
        overlay.expand();
        return;
      }
      const match = overlay.songs.find((s) => s.id === id || s._id === id);
      overlay.open(match ?? currentTrack);
    };
  }, [currentTrack]);

  const handleClear = useCallback(() => {
    void clear();
  }, [clear]);

  const { handleCloseMini, dragY, handlePan, surfaceGesture } = useFloatingPlayerActions({
    clear: handleClear,
    trackId: currentTrack?.id,
    onExpand: openFullPlayer,
  });

  if (!shouldMountPlayer || !currentTrack) {
    return null;
  }

  return (
    <FloatingMiniBar
      currentTrack={currentTrack}
      isPlaying={isPlaying}
      isLoading={isLoading}
      progress={progress}
      dragY={dragY}
      handlePan={handlePan}
      surfaceGesture={surfaceGesture}
      overlayCovered={overlayCovered}
      onOpenFullPlayer={openFullPlayer}
      onTogglePlayPause={togglePlayPause}
      onNext={next}
      onClose={handleCloseMini}
    />
  );
}
