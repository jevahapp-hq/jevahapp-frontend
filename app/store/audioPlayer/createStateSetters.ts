import type {
  AudioPlayerGet,
  AudioPlayerSet,
  GlobalAudioPlayerState,
  VirtualTrackControls,
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
  | "setVirtualTrackControls"
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
      const { duration, position: prev } = get();
      if (Math.abs(prev - position) < 40) return;
      const progress = duration > 0 ? position / duration : 0;
      set({ position, progress });
    },
    setDuration: (duration: number) => {
      if (get().duration === duration) return;
      set({ duration });
    },
    setProgressValue: (progress: number) => {
      const { duration, progress: prev } = get();
      if (Math.abs(prev - progress) < 0.002) return;
      const position = duration * progress;
      set({ progress, position });
    },
    setVirtualTrackControls: (controls: VirtualTrackControls | null) =>
      set({ __virtualTrackControls: controls || undefined }),
  };
}
