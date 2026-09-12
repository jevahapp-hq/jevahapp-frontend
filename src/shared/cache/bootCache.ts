/**
 * Expo Go has no native MMKV. Feed/music JSON lives in AsyncStorage and must
 * land in the in-memory map *before* Home's first query, or ALL waits on
 * the network while the screen stays blank.
 */
import type { QueryClient } from "@tanstack/react-query";
import { hydrateFeedQueryCache } from "./hydrateFeedQueryCache";
import {
  BOOT_FALLBACK_PREFIXES,
  bootCacheExplicitKeys,
} from "./persistKeys";
import { hydratePersistedQueryCache } from "./persistQueryClient";
import {
  hydrateFallbackKvByPrefix,
  hydrateFallbackKvFromAsyncStorage,
  isMmkvNative,
} from "./mmkvStorage";

export { bootCacheExplicitKeys } from "./persistKeys";

let bootPromise: Promise<void> | null = null;

async function runBootCacheHydration(queryClient: QueryClient): Promise<void> {
  if (!isMmkvNative) {
    await hydrateFallbackKvFromAsyncStorage(bootCacheExplicitKeys());
  }
  hydrateFeedQueryCache(queryClient);
  hydratePersistedQueryCache(queryClient);

  if (isMmkvNative) return;

  try {
    await hydrateFallbackKvByPrefix([...BOOT_FALLBACK_PREFIXES]);
    hydrateFeedQueryCache(queryClient);
    hydratePersistedQueryCache(queryClient);
  } catch {
    // prefix scan is best-effort
  }
}

/** Kick off as soon as the root QueryClient exists (module load). */
export function startBootCacheHydration(
  queryClient: QueryClient
): Promise<void> {
  if (!bootPromise) {
    bootPromise = runBootCacheHydration(queryClient).catch(() => {});
  }
  return bootPromise;
}

export function whenBootCacheReady(): Promise<void> {
  return bootPromise ?? Promise.resolve();
}
