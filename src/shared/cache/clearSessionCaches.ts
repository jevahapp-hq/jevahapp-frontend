import AsyncStorage from "@react-native-async-storage/async-storage";
import { mmkvRemove } from "./mmkvStorage";
import { RQ_PERSIST_DISK_KEY, SIGNED_URL_DISK_KEY } from "./persistKeys";
import {
  getSessionCacheUserId,
  setSessionCacheUserId,
} from "./sessionCacheScope";
import { clearPersistedQueryCache } from "./persistQueryClient";

const FEED_AFFINITY_KEY = "feed_affinity_v1";
const FEED_IMPRESSIONS_KEY = "feed_impressions_v1";
const FEED_SESSION_SEED_KEY = "feed_session_seed_v1";
const FEED_LAST_SESSION_TOPS_KEY = "feed_last_session_tops_v1";

/**
 * Wipe user-scoped React Query, MMKV, and feed personalization so the next
 * account cannot inherit the previous profile or affinity.
 */
export async function clearUserScopedSessionCaches(): Promise<void> {
  const uid = getSessionCacheUserId();

  clearPersistedQueryCache();
  mmkvRemove(RQ_PERSIST_DISK_KEY);
  mmkvRemove(`${RQ_PERSIST_DISK_KEY}:${uid}`);
  mmkvRemove(SIGNED_URL_DISK_KEY);
  setSessionCacheUserId(null);

  try {
    await AsyncStorage.multiRemove([
      FEED_AFFINITY_KEY,
      `${FEED_AFFINITY_KEY}:${uid}`,
      FEED_IMPRESSIONS_KEY,
      `${FEED_IMPRESSIONS_KEY}:${uid}`,
      FEED_SESSION_SEED_KEY,
      FEED_LAST_SESSION_TOPS_KEY,
    ]);
  } catch {
    // continue
  }

  try {
    const { resetFeedAffinityMemory } = await import(
      "../../features/media/AllContentTikTok/utils/feedAffinityStore"
    );
    resetFeedAffinityMemory();
  } catch {
    // optional
  }

  try {
    const { resetFeedImpressionMemory } = await import(
      "../../features/media/AllContentTikTok/utils/feedImpressionStore"
    );
    resetFeedImpressionMemory();
  } catch {
    // optional
  }
}
