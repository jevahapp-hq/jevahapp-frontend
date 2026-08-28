/**
 * Boots aggressive like-cache flush: on mount, when app returns to foreground,
 * and when the network becomes reachable again.
 */
import { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import * as Network from "expo-network";
import { flushLikeMutationQueue } from "./likeFlush";
import { getPersistedContentInteractions } from "../contentInteractionPersist";
import { useInteractionStore } from "@/store/useInteractionStore";
import { devLog } from "./logging";

function hydrateStatsFromDiskCache() {
  void getPersistedContentInteractions().then((map) => {
    const items = Object.entries(map).map(([contentId, value]) => ({
      contentId,
      hasLiked: value.liked,
      hasBookmarked: value.saved,
      likes: value.likes,
      saves: value.saves,
      comments: value.comments,
      views: value.views,
    }));
    if (items.length === 0) return;
    useInteractionStore.getState().hydrateUserInteractionsFromFeed(items);
    devLog(`💾 Hydrated ${items.length} interaction cache entries`);
  });
}

async function flushSafely() {
  try {
    const result = await flushLikeMutationQueue();
    if (result.flushed > 0) {
      devLog(
        `🚀 Flushed ${result.flushed} offline like(s); remaining=${result.remaining}`
      );
    }
  } catch (error) {
    console.warn("Like queue flush failed:", error);
  }
}

/**
 * Call once near the app root. Safe to mount in multiple places (listeners dedupe via module flush mutex).
 */
export function useLikeQueueBootstrap() {
  useEffect(() => {
    hydrateStatsFromDiskCache();
    void flushSafely();

    const onAppState = (next: AppStateStatus) => {
      if (next === "active") {
        hydrateStatsFromDiskCache();
        void flushSafely();
      }
    };
    const appSub = AppState.addEventListener("change", onAppState);

    let networkSub: { remove: () => void } | undefined;
    try {
      networkSub = Network.addNetworkStateListener((state) => {
        if (state.isConnected && state.isInternetReachable !== false) {
          void flushSafely();
        }
      });
    } catch {
      // Older expo-network — AppState flush is enough.
    }

    return () => {
      appSub.remove();
      networkSub?.remove();
    };
  }, []);
}
