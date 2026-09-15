import type { AudioTrack } from "@/store/audioPlayer/types";

let remembered: AudioTrack[] = [];
let rememberedSermons: AudioTrack[] = [];

export function rememberSessionAudioQueue(tracks: AudioTrack[]): void {
  remembered = Array.isArray(tracks)
    ? tracks.filter((t) => !!t?.id && !!t.audioUrl)
    : [];
}

export function rememberSermonAudioQueue(tracks: AudioTrack[]): void {
  rememberedSermons = Array.isArray(tracks)
    ? tracks.filter((t) => !!t?.id && !!t.audioUrl)
    : [];
}

export function getSessionAudioQueue(): AudioTrack[] {
  return remembered;
}

export function getSermonAudioQueue(): AudioTrack[] {
  return rememberedSermons;
}

/** Prefer an explicit list, then the remembered session, else just this track. */
export function resolvePlaybackQueue(
  track: AudioTrack,
  explicit?: AudioTrack[] | null
): AudioTrack[] {
  const cleaned = Array.isArray(explicit)
    ? explicit.filter((t) => !!t?.id && !!t.audioUrl)
    : [];
  if (cleaned.length > 0) {
    if (cleaned.some((t) => t.id === track.id)) return cleaned;
    return [track, ...cleaned];
  }
  if (remembered.some((t) => t.id === track.id)) return remembered;
  return [track];
}
