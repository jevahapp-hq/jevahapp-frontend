import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";

/** Red X / back / swipe: remove the music popup and stop the track. */
export function stopAndDismissNowPlaying() {
  useCopyrightFreeOverlayStore.getState().dismiss();
  void useGlobalAudioPlayerStore.getState().clear();
}
