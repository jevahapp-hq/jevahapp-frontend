import * as Network from "expo-network";

let lastOnline: boolean | null = null;
let lastCheckedAt = 0;
const CACHE_MS = 2_000;

/** Fast connectivity probe with a short memory cache (aggressive, cheap). */
export async function isNetworkOnline(force = false): Promise<boolean> {
  const now = Date.now();
  if (
    !force &&
    lastOnline !== null &&
    now - lastCheckedAt < CACHE_MS
  ) {
    return lastOnline;
  }

  try {
    const state = await Network.getNetworkStateAsync();
    lastOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    // If the probe itself fails, assume online and let fetch decide.
    lastOnline = true;
  }
  lastCheckedAt = now;
  return lastOnline;
}

export function isLikelyNetworkFailure(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error ? error.message : String(error);
  return /network request failed|failed to fetch|networkerror|timed out|timeout|offline|internet/i.test(
    message
  );
}
