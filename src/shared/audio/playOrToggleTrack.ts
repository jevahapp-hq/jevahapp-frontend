import { useGlobalAudioPlayerStore } from "../../../app/store/useGlobalAudioPlayerStore";
import type { AudioTrack } from "../../../app/store/audioPlayer/types";

/**
 * Single-session play: one Sound for the whole app.
 * Same track + playing → pause. Same track + paused → resume. Else load & play.
 */
export async function playOrToggleTrack(track: AudioTrack): Promise<void> {
  if (!track?.id || !track.audioUrl) return;
  const store = useGlobalAudioPlayerStore.getState();

  if (store.currentTrack?.id === track.id) {
    await store.togglePlayPause();
    return;
  }

  if (
    track.source === "feed" ||
    track.source === "hymn" ||
    track.source === "ebook" ||
    track.source === "library"
  ) {
    useGlobalAudioPlayerStore.setState({
      queue: [track],
      originalQueue: [track],
      currentIndex: 0,
      isShuffled: false,
    });
  }

  try {
    const videoStore = require("../../../app/store/useGlobalVideoStore")
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
