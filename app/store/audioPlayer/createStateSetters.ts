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
    setPlaying: (playing: boolean) => set({ isPlaying: playing }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setPosition: (position: number) => {
      const { duration } = get();
      const progress = duration > 0 ? position / duration : 0;
      set({ position, progress });
    },
    setDuration: (duration: number) => set({ duration }),
    setProgressValue: (progress: number) => {
      const { duration } = get();
      const position = duration * progress;
      set({ progress, position });
    },
    setVirtualTrackControls: (controls: VirtualTrackControls | null) =>
      set({ __virtualTrackControls: controls || undefined }),
  };
}
