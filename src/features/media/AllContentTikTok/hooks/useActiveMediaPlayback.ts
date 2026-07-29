/**
 * Maps focused feed key → exactly one playing media (TikTok mutual exclusion).
 */
import { useEffect, useRef } from "react";
import type { MediaItem } from "../../../../shared/types";

export function useActiveMediaPlayback(options: {
  enabled: boolean;
  focusedKey: string | null;
  items: MediaItem[];
  getContentKey: (item: MediaItem) => string;
  playMedia: (key: string, type: "video" | "audio") => void;
  pauseAllMedia: () => void;
  isAudioItem?: (item: MediaItem) => boolean;
}) {
  const {
    enabled,
    focusedKey,
    items,
    getContentKey,
    playMedia,
    pauseAllMedia,
    isAudioItem,
  } = options;

  const lastPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (lastPlayedRef.current) {
        pauseAllMedia();
        lastPlayedRef.current = null;
      }
      return;
    }

    if (!focusedKey) {
      if (lastPlayedRef.current) {
        pauseAllMedia();
        lastPlayedRef.current = null;
      }
      return;
    }

    if (lastPlayedRef.current === focusedKey) return;

    const item = items.find((i) => getContentKey(i) === focusedKey);
    if (!item) return;

    const isAudio = isAudioItem
      ? isAudioItem(item)
      : String(item.contentType || "").toLowerCase().includes("audio") ||
        String(item.contentType || "").toLowerCase().includes("music") ||
        String(item.contentType || "").toLowerCase().includes("podcast");

    // Only autoplay video in the main feed loop (music stays tap-to-play)
    if (isAudio) {
      if (lastPlayedRef.current) {
        pauseAllMedia();
        lastPlayedRef.current = null;
      }
      return;
    }

    if (!item.fileUrl && !(item as any).mediaUrl && !(item as any).videoUrl) {
      return;
    }

    pauseAllMedia();
    playMedia(focusedKey, "video");
    lastPlayedRef.current = focusedKey;
  }, [
    enabled,
    focusedKey,
    items,
    getContentKey,
    playMedia,
    pauseAllMedia,
    isAudioItem,
  ]);
}
