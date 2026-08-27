/**
 * Expo-video seek/position helpers.
 * expo-video uses seconds (`currentTime` / `duration`); expo-av uses ms + setPositionAsync.
 */
export function getPlayerPositionMs(player: any): number {
  if (!player) return 0;
  try {
    if (
      typeof player.currentTime === "number" &&
      Number.isFinite(player.currentTime)
    ) {
      return Math.max(0, player.currentTime * 1000);
    }
  } catch {
    // no-op
  }
  return 0;
}

/**
 * Read duration from player + common event payload shapes (seconds → ms).
 */
export function getPlayerDurationMs(player: any, fallbackMs = 0): number {
  const MAX = 24 * 60 * 60 * 1000;
  const fromSec = (sec: unknown): number => {
    const n = typeof sec === "number" ? sec : Number(sec);
    if (!Number.isFinite(n) || n <= 0) return 0;
    // sourceLoad / some devices report milliseconds already
    if (n > 86400) return Math.min(n, MAX);
    return Math.min(n * 1000, MAX);
  };

  if (player) {
    try {
      const d = fromSec(player.duration);
      if (d > 0) return d;
    } catch {
      // no-op
    }
  }

  if (fallbackMs > 0 && Number.isFinite(fallbackMs)) {
    return Math.min(fallbackMs, MAX);
  }
  return 0;
}

/** Prefer sourceLoad / status payloads which often have duration before player.duration. */
export function durationMsFromPayload(payload: any, player?: any): number {
  if (payload && typeof payload === "object") {
    if (typeof payload.duration === "number" && payload.duration > 0) {
      // sourceLoad documents seconds; if already huge treat as ms
      if (payload.duration > 86400) {
        return Math.min(payload.duration, 24 * 60 * 60 * 1000);
      }
      return Math.min(payload.duration * 1000, 24 * 60 * 60 * 1000);
    }
  }
  return getPlayerDurationMs(player, 0);
}

export async function seekPlayerToMs(
  player: any,
  targetMs: number,
  fallbackDurationMs = 0
): Promise<boolean> {
  if (!player) return false;
  const durationMs = getPlayerDurationMs(player, fallbackDurationMs);
  // Leave headroom so we don't land in "ended" and restart at 0
  const clamped = Math.max(
    0,
    durationMs > 0
      ? Math.min(targetMs, Math.max(0, durationMs - 250))
      : targetMs
  );
  const seconds = clamped / 1000;

  try {
    if ("currentTime" in player) {
      player.currentTime = seconds;
      return true;
    }
    if (typeof player.seekBy === "function") {
      const cur = getPlayerPositionMs(player) / 1000;
      player.seekBy(seconds - cur);
      return true;
    }
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
  if (durationMs <= 0) {
    // Relative seek still works without knowing full duration
    try {
      if (player && typeof player.seekBy === "function") {
        player.seekBy(deltaSec);
        return true;
      }
      if (player && "currentTime" in player) {
        player.currentTime = Math.max(0, currentMs / 1000 + deltaSec);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
  const next = Math.max(0, Math.min(currentMs + deltaSec * 1000, durationMs));
  return seekPlayerToMs(player, next, durationMs);
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
