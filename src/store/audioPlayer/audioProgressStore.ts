import { create } from "zustand";

/**
 * High-frequency playback clock.
 *
 * Position ticks (~250ms) live here so the session store
 * (`useGlobalAudioPlayerStore`) can stay identity/transport-only.
 * Progress UIs subscribe here; lists, screens, and play/pause chrome must not.
 */
export type AudioPlaybackClock = {
  trackId: string | null;
  position: number;
  duration: number;
  progress: number;
};

let lastCommitTs = 0;

export const useAudioProgressStore = create<AudioPlaybackClock>()(() => ({
  trackId: null,
  position: 0,
  duration: 0,
  progress: 0,
}));

export function getAudioPlaybackClock(): AudioPlaybackClock {
  return useAudioProgressStore.getState();
}

export function getLastAudioProgressCommitTs(): number {
  return lastCommitTs;
}

export function resetAudioPlaybackClock(
  trackId: string | null = null,
  duration = 0
): void {
  lastCommitTs = 0;
  useAudioProgressStore.setState({
    trackId,
    position: 0,
    duration,
    progress: 0,
  });
}

export function writeAudioPlaybackClock(
  next: Partial<AudioPlaybackClock>,
  now = Date.now()
): void {
  const prev = useAudioProgressStore.getState();
  const trackId = next.trackId !== undefined ? next.trackId : prev.trackId;
  const position = next.position !== undefined ? next.position : prev.position;
  const duration = next.duration !== undefined ? next.duration : prev.duration;
  const progress = next.progress !== undefined ? next.progress : prev.progress;
  if (
    trackId === prev.trackId &&
    position === prev.position &&
    duration === prev.duration &&
    progress === prev.progress
  ) {
    return;
  }
  lastCommitTs = now;
  useAudioProgressStore.setState({ trackId, position, duration, progress });
}

/** Copy the live clock onto a discrete session snapshot (pause / seek / finish). */
export function playbackClockSnapshot(): Pick<
  AudioPlaybackClock,
  "position" | "duration" | "progress"
> {
  const { position, duration, progress } = useAudioProgressStore.getState();
  return { position, duration, progress };
}

/** Progress for this track, or 0. Non-current callers do not re-render on ticks. */
export function useAudioProgressForTrack(
  trackId: string | null | undefined
): number {
  return useAudioProgressStore((s) =>
    trackId && s.trackId === trackId ? s.progress : 0
  );
}

export function useAudioPositionForTrack(
  trackId: string | null | undefined
): number {
  return useAudioProgressStore((s) =>
    trackId && s.trackId === trackId ? s.position : 0
  );
}

export function useAudioDurationForTrack(
  trackId: string | null | undefined
): number {
  return useAudioProgressStore((s) =>
    trackId && s.trackId === trackId ? s.duration : 0
  );
}
