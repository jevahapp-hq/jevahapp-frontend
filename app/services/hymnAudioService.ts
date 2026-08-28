import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { playOrToggleTrack } from "../../src/shared/audio/playOrToggleTrack";

export interface HymnAudio {
  id: string;
  title: string;
  audioUrl: string;
  duration: number;
  artist?: string;
  thumbnailUrl?: string;
}

function hymnToTrack(hymn: HymnAudio) {
  return {
    id: hymn.id,
    title: hymn.title,
    artist: hymn.artist || "Traditional Hymn",
    audioUrl: hymn.audioUrl,
    thumbnailUrl: hymn.thumbnailUrl || "",
    duration: hymn.duration,
    category: "hymn",
    source: "hymn" as const,
  };
}

class HymnAudioService {
  async playHymn(hymn: HymnAudio): Promise<void> {
    if (!hymn?.audioUrl) {
      throw new Error("Failed to play hymn audio");
    }
    await playOrToggleTrack(hymnToTrack(hymn));
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.id === hymn.id && !store.isPlaying) {
      await store.play();
    }
  }

  async pauseHymn(): Promise<void> {
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.source === "hymn" && store.isPlaying) {
      await store.pause();
    }
  }

  async resumeHymn(): Promise<void> {
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.source === "hymn" && !store.isPlaying) {
      await store.play();
    }
  }

  async stopHymn(): Promise<void> {
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.source === "hymn") {
      await store.stop();
    }
  }

  async togglePlayPause(hymn: HymnAudio): Promise<void> {
    await playOrToggleTrack(hymnToTrack(hymn));
  }

  getPlaybackState(): { isPlaying: boolean; currentHymnId: string | null } {
    const { currentTrack, isPlaying } = useGlobalAudioPlayerStore.getState();
    const isHymn = currentTrack?.source === "hymn";
    return {
      isPlaying: isHymn && isPlaying,
      currentHymnId: isHymn ? currentTrack?.id ?? null : null,
    };
  }

  async cleanup(): Promise<void> {
    const store = useGlobalAudioPlayerStore.getState();
    if (store.currentTrack?.source === "hymn") {
      await store.pause();
    }
  }
}

export default new HymnAudioService();
