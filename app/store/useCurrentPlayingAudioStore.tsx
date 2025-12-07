import { create } from "zustand";
import { MediaItem } from "../../src/shared/types";

interface CurrentPlayingAudioState {
  currentAudio: {
    mediaItem: MediaItem | null;
    audioId: string | null;
  };
  
  setCurrentAudio: (mediaItem: MediaItem | null, audioId: string | null) => void;
  clearCurrentAudio: () => void;
}

export const useCurrentPlayingAudioStore = create<CurrentPlayingAudioState>((set) => ({
  currentAudio: {
    mediaItem: null,
    audioId: null,
  },
  
  setCurrentAudio: (mediaItem, audioId) => {
    set({
      currentAudio: {
        mediaItem,
        audioId,
      },
    });
  },
  
  clearCurrentAudio: () => {
    set({
      currentAudio: {
        mediaItem: null,
        audioId: null,
      },
    });
  },
}));






