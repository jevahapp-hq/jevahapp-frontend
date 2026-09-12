import type { VideoPlayer } from "expo-video";

/**
 * expo-video SharedObjects throw when the native player is already released
 * ("Cannot use shared object that was already released"). Truthiness checks
 * are not enough — the JS wrapper stays alive after native `release()`.
 */

export function isLiveVideoPlayer(
  player: unknown
): player is VideoPlayer {
  if (!player || typeof player !== "object") return false;
  try {
    const status = (player as VideoPlayer).status;
    return typeof status === "string";
  } catch {
    return false;
  }
}

export function readPlayerCurrentTimeSec(
  player: VideoPlayer | null | undefined
): number {
  if (!player) return 0;
  try {
    const t = Number(player.currentTime);
    return Number.isFinite(t) && t > 0 ? t : 0;
  } catch {
    return 0;
  }
}

export function runWithLivePlayer(
  player: VideoPlayer | null | undefined,
  fn: (player: VideoPlayer) => void
): void {
  if (!player) return;
  try {
    fn(player);
  } catch {
    // Native player already released.
  }
}
