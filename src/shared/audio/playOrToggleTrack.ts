import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import type { AudioTrack } from "@/store/audioPlayer/types";
import {
  playOrToggleDecision,
  shouldReplaceAudioQueue,
} from "./playOrToggleDecision";

/**
 * Single-session play: one Sound for the whole app.
 * Same track + playing → pause. Same track + paused → resume. Else load & play.
 */
export async function playOrToggleTrack(track: AudioTrack): Promise<void> {
  if (!track?.id || !track.audioUrl) return;
  const store = useGlobalAudioPlayerStore.getState();

  if (playOrToggleDecision(store.currentTrack?.id, track.id) === "toggle") {
    await store.togglePlayPause();
    return;
  }

  if (shouldReplaceAudioQueue(track.source)) {
    useGlobalAudioPlayerStore.setState({
      queue: [track],
      originalQueue: [track],
      currentIndex: 0,
      isShuffled: false,
    });
  }

  try {
    const videoStore = require("@/store/useGlobalVideoStore")
      .useGlobalVideoStore.getState();
    videoStore.pauseAllVideosImperatively?.();
  } catch {
    // no-op
  }

  await store.setTrack(track, true);
  const next = useGlobalAudioPlayerStore.getState();
  if (!next.isPlaying && next.soundInstance) {
    await next.play();
  }
}

export async function pausePlaybackSession(): Promise<void> {
  const store = useGlobalAudioPlayerStore.getState();
  if (store.isPlaying) {
    await store.pause();
  }
}
