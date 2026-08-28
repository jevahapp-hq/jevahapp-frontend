import type { AudioTrack } from "@/store/useGlobalAudioPlayerStore";

type Source = AudioTrack["source"];

/** User-uploaded sermon / feed audio. */
export function isFeedUploadAudio(source?: Source): boolean {
  return source === "feed";
}

/** Copyright-free catalog lane. */
export function isCopyrightFreeAudio(source?: Source): boolean {
  return source === "copyright-free";
}

/** Artist releases + saved library tracks. */
export function isArtistOrLibraryAudio(source?: Source): boolean {
  return source === "library";
}

/** Hymns and ebook TTS use dedicated UIs — not the shared audio modal. */
export function isDedicatedLaneAudio(source?: Source): boolean {
  return source === "hymn" || source === "ebook";
}

/**
 * Where the Now Playing bar should go when the user taps to expand.
 *
 * Returning a destination rather than a boolean is deliberate: a boolean let the
 * call site `if (…) open()` and silently do nothing on the false branch, which
 * is exactly how the mini bar ended up with a dead tap. Callers must handle
 * every member of this union, and `"none"` obliges the UI to hide the expand
 * affordance instead of offering an inert one.
 */
export type FullPlayerTarget =
  /** The shared full-screen audio player overlay. */
  | "audio-modal"
  /** No richer surface exists — do not render an expand affordance. */
  | "none";

export function resolveFullPlayerTarget(source?: Source): FullPlayerTarget {
  if (isDedicatedLaneAudio(source)) return "none";
  // feed / copyright-free / library / unknown all carry title, artist, artwork
  // and duration, which is everything the shared player renders.
  return "audio-modal";
}

/** Convenience predicate for call sites that only need a yes/no. */
export function supportsFullScreenPlayer(source?: Source): boolean {
  return resolveFullPlayerTarget(source) !== "none";
}
