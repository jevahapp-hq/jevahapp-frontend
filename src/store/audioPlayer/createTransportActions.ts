import { playbackClockSnapshot, resetAudioPlaybackClock, writeAudioPlaybackClock } from "./audioProgressStore";
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
        if (soundInstance.isLoaded && soundInstance.playing) {
          return;
        }
        const clock = playbackClockSnapshot();
        const dur = clock.duration || get().duration;
        const pos = clock.position ?? get().position;
        if (dur > 0 && pos >= Math.max(0, dur - 400)) {
          try {
            await soundInstance.seekTo(0);
          } catch {
            // play from wherever the engine is
          }
          resetAudioPlaybackClock(currentTrack?.id ?? null, dur);
          writeAudioPlaybackClock({
            trackId: currentTrack?.id ?? null,
            position: 0,
            progress: 0,
            duration: dur,
          });
          set({ position: 0, progress: 0, duration: dur });
        }
        soundInstance.play();
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
      const { soundInstance, duration } = get();
      if (soundInstance) {
        try {
          soundInstance.pause();
          const clock = playbackClockSnapshot();
          // Snapshot the clock so analytics/getState() see the paused head
          // without having subscribed to ticks during play.
          set({
            isPlaying: false,
            position: clock.position,
            progress: clock.progress,
            duration: clock.duration || duration,
          });
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
          soundInstance.muted = muted;
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
          soundInstance.setPlaybackRate(next);
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
          if (soundInstance.isLoaded) {
            if (soundInstance.playing) {
              await pause();
            }
            await soundInstance.seekTo(0);
          }
        } catch (error) {
          // Non‑fatal: if sound is already unloaded or not ready, just ignore.
          console.warn("Warning while stopping audio (non-fatal):", error);
        }
      }
      set({ position: 0, progress: 0 });
      resetAudioPlaybackClock(get().currentTrack?.id ?? null, get().duration);
    },
  };
}
