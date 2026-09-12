import { writeAudioPlaybackClock } from "./audioProgressStore";
import type {
  AudioPlayerGet,
  AudioPlayerSet,
  GlobalAudioPlayerState,
} from "./types";

export function createStateSetters(
  get: AudioPlayerGet,
  set: AudioPlayerSet
): Pick<
  GlobalAudioPlayerState,
  | "setPlaying"
  | "setLoading"
  | "setPosition"
  | "setDuration"
  | "setProgressValue"
> {
  return {
    setPlaying: (playing: boolean) => {
      if (get().isPlaying === playing) return;
      set({ isPlaying: playing });
    },
    setLoading: (loading: boolean) => {
      if (get().isLoading === loading) return;
      set({ isLoading: loading });
    },
    setPosition: (position: number) => {
      const { duration, position: prev, currentTrack } = get();
      if (Math.abs(prev - position) < 150) return;
      const progress = duration > 0 ? position / duration : 0;
      writeAudioPlaybackClock({
        trackId: currentTrack?.id ?? null,
        position,
        progress,
        duration,
      });
      set({ position, progress });
    },
    setDuration: (duration: number) => {
      if (get().duration === duration) return;
      writeAudioPlaybackClock({ duration, trackId: get().currentTrack?.id ?? null });
      set({ duration });
    },
    setProgressValue: (progress: number) => {
      const { duration, progress: prev, currentTrack } = get();
      if (Math.abs(prev - progress) < 0.002) return;
      const position = duration * progress;
      writeAudioPlaybackClock({
        trackId: currentTrack?.id ?? null,
        position,
        progress,
        duration,
      });
      set({ progress, position });
    },
  };
}
