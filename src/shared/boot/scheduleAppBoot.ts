import type { QueryClient } from "@tanstack/react-query";
import {
  startBootCacheHydration,
  whenBootCacheReady,
} from "../cache/bootCache";
import { hydrateFeedQueryCache } from "../cache/hydrateFeedQueryCache";
import {
  hydratePersistedQueryCache,
  registerPersistedQueryClient,
  subscribePersistedQueryCache,
} from "../cache/persistQueryClient";
import { hydrateLiteProfileSync } from "../lite/liteProfile";
import { registerDefaultContentQueryDefaults } from "../media/useDefaultContentQuery";

export { whenBootCacheReady };

/**
 * Feed seed and query defaults. Kept off the root layout so Expo Go can
 * paint the shell before this graph is evaluated.
 */
export function scheduleAppBoot(queryClient: QueryClient): void {
  registerDefaultContentQueryDefaults(queryClient);
  try {
    hydrateLiteProfileSync();
    hydrateFeedQueryCache(queryClient);
    hydratePersistedQueryCache(queryClient);
  } catch {
    // Corrupt cache must not block launch.
  }
  registerPersistedQueryClient(queryClient);
  subscribePersistedQueryCache(queryClient);
  void startBootCacheHydration(queryClient);
}
