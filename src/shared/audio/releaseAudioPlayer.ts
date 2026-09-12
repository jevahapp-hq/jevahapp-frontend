import type { AudioPlayer } from "expo-audio";

/** Tear down a manually created expo-audio player (createAudioPlayer). */
export function releaseAudioPlayer(player: AudioPlayer | null | undefined): void {
  if (!player) return;
  try {
    player.pause();
  } catch {
    // already stopped
  }
  try {
    // Android bookkeeping; safe no-op elsewhere.
    (player as AudioPlayer & { remove?: () => void }).remove?.();
  } catch {
    // ignore
  }
  try {
    (player as AudioPlayer & { release?: () => void }).release?.();
  } catch {
    // already released
  }
}
