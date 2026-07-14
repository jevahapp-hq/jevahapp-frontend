/**
 * Expo-video seek/position helpers.
 * expo-video uses seconds (`currentTime` / `duration`); expo-av uses ms + setPositionAsync.
 */
export function getPlayerPositionMs(player: any): number {
  if (!player) return 0;
  if (typeof player.currentTime === "number" && Number.isFinite(player.currentTime)) {
    return Math.max(0, player.currentTime * 1000);
  }
  return 0;
}

export function getPlayerDurationMs(player: any, fallbackMs = 0): number {
  if (!player) return fallbackMs;
  if (typeof player.duration === "number" && player.duration > 0) {
    return Math.min(player.duration * 1000, 24 * 60 * 60 * 1000);
  }
  return fallbackMs;
}

export async function seekPlayerToMs(player: any, targetMs: number): Promise<boolean> {
  if (!player) return false;
  const durationMs = getPlayerDurationMs(player);
  const clamped = Math.max(
    0,
    durationMs > 0 ? Math.min(targetMs, durationMs) : targetMs
  );

  try {
    // expo-video
    if (typeof player.currentTime === "number" || "currentTime" in player) {
      player.currentTime = clamped / 1000;
      return true;
    }
    // expo-av fallback
    if (typeof player.setPositionAsync === "function") {
      await player.setPositionAsync(clamped);
      return true;
    }
  } catch (e) {
    if (__DEV__) console.warn("seekPlayerToMs failed:", e);
  }
  return false;
}

export async function seekPlayerBySeconds(
  player: any,
  deltaSec: number,
  currentMs: number,
  fallbackDurationMs = 0
): Promise<boolean> {
  const durationMs = getPlayerDurationMs(player, fallbackDurationMs);
  if (durationMs <= 0) return false;
  const next = Math.max(0, Math.min(currentMs + deltaSec * 1000, durationMs));
  return seekPlayerToMs(player, next);
}

export function pausePlayer(player: any): void {
  if (!player) return;
  try {
    if (typeof player.pause === "function") player.pause();
    else if (typeof player.pauseAsync === "function") player.pauseAsync();
  } catch {
    // no-op
  }
}

export function playPlayer(player: any): void {
  if (!player) return;
  try {
    if (typeof player.play === "function") player.play();
    else if (typeof player.playAsync === "function") player.playAsync();
  } catch {
    // no-op
  }
}
