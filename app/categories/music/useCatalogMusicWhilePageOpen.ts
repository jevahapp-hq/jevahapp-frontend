import { useEffect } from "react";
import { stopAndDismissNowPlaying } from "@/shared/audio/stopNowPlaying";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";

let openMusicPages = 0;

function stopCatalogMusic() {
  const source = useGlobalAudioPlayerStore.getState().currentTrack?.source;
  if (source !== "copyright-free" && source !== "library") return;
  stopAndDismissNowPlaying();
}

/**
 * Catalog music keeps playing after the full player closes.
 * It stops when the last visible music page goes away.
 */
export function useCatalogMusicWhilePageOpen(active: boolean) {
  useEffect(() => {
    if (!active) return;
    openMusicPages += 1;
    return () => {
      openMusicPages -= 1;
      if (openMusicPages > 0) return;
      stopCatalogMusic();
    };
  }, [active]);
}
