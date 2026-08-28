/**
 * Feed ranking signals for the vertical For You surface.
 * Soft-fail; never blocks playback. Counted views stay on contentInteractionAPI.
 */
import { useEffect, useRef } from "react";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import type { MediaItem } from "../types";
import { enqueueFeedEvent } from "./feedRanker";

const IMPRESSION_DWELL_MS = 300;
const SKIP_UNDER_MS = 1500;
const WATCH_TICK_MS = 5000;

export function useForYouFeedSignals(options: {
  enabled: boolean;
  focusedKey: string | null;
  items: MediaItem[];
  getContentKey: (item: MediaItem) => string;
  source?: string;
}) {
  const {
    enabled,
    focusedKey,
    items,
    getContentKey,
    source = "for_you",
  } = options;

  const focusStartedAt = useRef<number>(0);
  const impressedKeys = useRef<Set<string>>(new Set());
  const lastWatchTickAt = useRef<number>(0);
  const isPlayingFocused = useGlobalVideoStore((s) =>
    focusedKey ? s.playingVideos[focusedKey] ?? false : false
  );
  const focusedProgress = useGlobalVideoStore((s) =>
    focusedKey ? s.progresses[focusedKey] ?? 0 : 0
  );

  // Impression after ≥300ms dwell on focused card
  useEffect(() => {
    if (!enabled || !focusedKey) return;
    focusStartedAt.current = Date.now();
    lastWatchTickAt.current = Date.now();

    const item = items.find((i) => getContentKey(i) === focusedKey);
    const contentId = String(item?._id || focusedKey || "");
    if (!contentId) return;

    const t = setTimeout(() => {
      if (impressedKeys.current.has(focusedKey)) return;
      impressedKeys.current.add(focusedKey);
      enqueueFeedEvent({
        contentId,
        contentType: String(item?.contentType || "media"),
        eventType: "impression",
        source,
      });
    }, IMPRESSION_DWELL_MS);

    return () => {
      clearTimeout(t);
      const watched = Date.now() - focusStartedAt.current;
      if (watched > 0 && watched < SKIP_UNDER_MS) {
        enqueueFeedEvent({
          contentId,
          contentType: String(item?.contentType || "media"),
          eventType: "skip",
          watchMs: watched,
          source,
        });
      }
    };
  }, [enabled, focusedKey, items, getContentKey, source]);

  // watch_time every ~5s while playing focused card
  useEffect(() => {
    if (!enabled || !focusedKey) return;
    const item = items.find((i) => getContentKey(i) === focusedKey);
    const contentId = String(item?._id || focusedKey || "");
    if (!contentId) return;

    const tick = () => {
      if (!isPlayingFocused) return;
      const now = Date.now();
      const delta = now - lastWatchTickAt.current;
      if (delta < WATCH_TICK_MS - 200) return;
      lastWatchTickAt.current = now;
      const progressPct = Number(focusedProgress ?? 0);
      enqueueFeedEvent({
        contentId,
        contentType: String(item?.contentType || "media"),
        eventType: "watch_time",
        watchMs: Math.min(delta, WATCH_TICK_MS + 500),
        progressPct,
        source,
      });
    };

    const id = setInterval(tick, WATCH_TICK_MS);
    return () => clearInterval(id);
  }, [
    enabled,
    focusedKey,
    items,
    getContentKey,
    source,
    isPlayingFocused,
    focusedProgress,
  ]);
}

/** Optional mirror of engagement into ranking events (additive). */
export function mirrorFeedEngagementEvent(
  contentId: string,
  eventType: "like" | "save" | "share",
  contentType = "media",
  source = "for_you"
) {
  if (!contentId) return;
  enqueueFeedEvent({ contentId, contentType, eventType, source });
}
