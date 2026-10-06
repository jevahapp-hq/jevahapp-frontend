export type NativeLoopMode = "none" | "single" | "all";

/** Native playlist loop. `one` repeats the current item without a JS timer. */
export function playlistLoopForRepeat(
  mode: "none" | "all" | "one" | undefined
): NativeLoopMode {
  if (mode === "one") return "single";
  if (mode === "all") return "all";
  return "none";
}

/** Stable identity for the queue currently loaded in the native player. */
export function queueIdentity(tracks: { id?: string | null }[]): string {
  return tracks.map((track) => String(track?.id || "")).join("\0");
}
