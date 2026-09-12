import type { AudioPlayerGet, AudioPlayerSet } from "./types";

export function detachStatusSubscription(
  get: AudioPlayerGet,
  set: AudioPlayerSet
): void {
  const sub = get().__statusSubscription;
  if (!sub) return;
  try {
    sub.remove();
  } catch {
    // already removed
  }
  set({ __statusSubscription: null });
}
