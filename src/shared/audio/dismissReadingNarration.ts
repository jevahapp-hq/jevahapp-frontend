import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import * as Speech from "expo-speech";
import { isReadingNarrationTrackId } from "./readingNarrationTrack";

const listeners = new Set<() => void>();

export { isReadingNarrationTrackId } from "./readingNarrationTrack";

export function subscribeReadingDismiss(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Drop a narration track without notifying readers. Used while a screen is unmounting. */
export function releaseReadingNarrationTrack(): void {
  const store = useGlobalAudioPlayerStore.getState();
  if (!isReadingNarrationTrackId(store.currentTrack?.id)) return;
  void store.clear();
}

/**
 * Stop ebook / Bible read-aloud and remove its mini bar.
 * Call this when the reader is left so the clip cannot sit on a video.
 */
export function dismissReadingNarration(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // no-op
    }
  });
  try {
    Speech.stop();
  } catch {
    // Device speech was not running.
  }
  releaseReadingNarrationTrack();
}
