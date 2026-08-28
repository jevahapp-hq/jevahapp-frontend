import type {
  AudioPlayerGet,
  AudioPlayerSet,
  GlobalAudioPlayerState,
} from "./types";

export function createTransportActions(
  get: AudioPlayerGet,
  set: AudioPlayerSet
): Pick<
  GlobalAudioPlayerState,
  "play" | "pause" | "togglePlayPause" | "setMuted" | "toggleMute" | "setRate" | "stop"
> {
  return {
    play: async () => {
      const { soundInstance, currentTrack, setTrack } = get();
      if (!soundInstance) {
        if (currentTrack) {
          await setTrack(currentTrack, true);
        }
        return;
      }
      try {
        const status = await soundInstance.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          return;
        }
        await soundInstance.playAsync();
        set({ isPlaying: true });
      } catch (error) {
        console.warn("Error playing audio:", (error as Error)?.message || error);
        if (currentTrack) {
          await setTrack(currentTrack, true);
          return;
        }
        set({ isPlaying: false });
      }
    },

    pause: async () => {
      const { soundInstance } = get();
      if (soundInstance) {
        try {
          await soundInstance.pauseAsync();
          set({ isPlaying: false });
        } catch (error) {
          console.warn("Error pausing audio:", (error as Error)?.message || error);
        }
      }
    },

    togglePlayPause: async () => {
      const { isPlaying, play, pause } = get();
      if (isPlaying) {
        await pause();
      } else {
        await play();
      }
    },

    setMuted: async (muted: boolean) => {
      const { soundInstance } = get();
      if (soundInstance) {
        try {
          await soundInstance.setIsMutedAsync(muted);
          set({ isMuted: muted });
        } catch (error) {
          console.error("Error setting mute:", error);
        }
      } else {
        set({ isMuted: muted });
      }
    },

    toggleMute: async () => {
      const { isMuted, setMuted } = get();
      await setMuted(!isMuted);
    },

    setRate: async (rate: number) => {
      const { soundInstance } = get();
      const next = Math.max(0.5, Math.min(2, rate));
      if (soundInstance) {
        try {
          await soundInstance.setRateAsync(next, true);
        } catch (error) {
          console.warn("Error setting playback rate:", error);
        }
      }
    },

    stop: async () => {
      const { soundInstance, pause } = get();
      if (soundInstance) {
        try {
          // Only attempt to pause/reset if the sound is actually loaded.
          const status = await soundInstance.getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              await pause();
            }
            await soundInstance.setPositionAsync(0);
          }
        } catch (error) {
          // Non‑fatal: if sound is already unloaded or not ready, just ignore.
          console.warn("Warning while stopping audio (non-fatal):", error);
        }
      }
      set({ position: 0, progress: 0 });
    },
  };
}
