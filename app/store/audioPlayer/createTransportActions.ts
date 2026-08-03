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
  "play" | "pause" | "togglePlayPause" | "setMuted" | "toggleMute" | "stop"
> {
  return {
    play: async () => {
      const { soundInstance, currentTrack, __virtualTrackControls } = get();
      // If this is a virtual track, use the external player's controls
      if (currentTrack?.isVirtual && __virtualTrackControls) {
        await __virtualTrackControls.play();
        return;
      }
      // Otherwise use the global player's controls
      if (soundInstance) {
        try {
          // Check if already playing to avoid unnecessary operations
          const status = await soundInstance.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            return; // Already playing, no need to do anything
          }

          // Play immediately
          await soundInstance.playAsync();
          set({ isPlaying: true });
        } catch (error) {
          console.error("Error playing audio:", error);
          set({ isPlaying: false });
        }
      }
    },

    pause: async () => {
      const { soundInstance, currentTrack, __virtualTrackControls } = get();
      // If this is a virtual track, use the external player's controls
      if (currentTrack?.isVirtual && __virtualTrackControls) {
        await __virtualTrackControls.pause();
        return;
      }
      // Otherwise use the global player's controls
      if (soundInstance) {
        try {
          await soundInstance.pauseAsync();
          set({ isPlaying: false });
        } catch (error) {
          console.error("Error pausing audio:", error);
        }
      }
    },

    togglePlayPause: async () => {
      const { isPlaying, play, pause, currentTrack, __virtualTrackControls } =
        get();
      // If this is a virtual track, use the external player's controls
      if (currentTrack?.isVirtual && __virtualTrackControls) {
        await __virtualTrackControls.togglePlayPause();
        // ✅ Sync playing state after toggle for virtual tracks
        // The external player will update its state, but we need to sync it here
        // We'll rely on the MusicCard's useEffect to sync, but also update optimistically
        setTimeout(() => {
          // The actual state will be synced by MusicCard's useEffect
          // This is just for immediate UI feedback
        }, 50);
        return;
      }
      // Otherwise use the global player's controls
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
