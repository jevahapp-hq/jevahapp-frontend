/**
 * Prefetch next video / music / ebook assets around the focused feed item.
 */
import { useEffect, useRef } from "react";
import { detectNetworkQuality } from "../../../../../app/utils/videoOptimization";
import { prefetchPdfUrls } from "../../../../../app/utils/pdfCache";
import type { MediaItem } from "../../../../shared/types";
import { isAudioSermon } from "../../../../shared/utils";
import { prefetchAudioUrls } from "../../../../shared/utils/audioPrefetch";
import { PERFORMANCE_CONFIG } from "../../../../shared/config/performance";
import { getLitePrefetchAhead, isLiteProfileActive } from "../../../../shared/lite/liteProfile";
import { getVideoUrlFromMedia } from "../../../../shared/utils/videoUrlManager";
import { prefetchVideoUrls } from "../../../../shared/utils/videoPrefetch";

function getAudioUrl(item: MediaItem): string | null {
  const raw =
    (item as any).fileUrl ||
    (item as any).audioUrl ||
    (item as any).mediaUrl ||
    null;
  return typeof raw === "string" && /^https?:\/\//i.test(raw.trim())
    ? raw.trim()
    : null;
}

function getEbookUrl(item: MediaItem): string | null {
  const raw =
    (item as any).fileUrl ||
    (item as any).pdfUrl ||
    (item as any).ebookUrl ||
    null;
  return typeof raw === "string" && /^https?:\/\//i.test(raw.trim())
    ? raw.trim()
    : null;
}

function isEbook(item: MediaItem): boolean {
  const t = String(item.contentType || "").toLowerCase().trim();
  return (
    t === "ebook" ||
    t === "ebooks" ||
    t === "e-books" ||
    t === "books" ||
    t === "book" ||
    t === "pdf" ||
    t === "image"
  );
}

export function useAdjacentVideoPrefetch(options: {
  focusedKey: string | null;
  items: MediaItem[];
  getContentKey: (item: MediaItem) => string;
  /** How many items ahead to warm (network-aware default applied) */
  ahead?: number;
}) {
  const { focusedKey, items, getContentKey } = options;
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusedKey || items.length === 0) return;
    if (lastKeyRef.current === focusedKey) return;
    lastKeyRef.current = focusedKey;

    let cancelled = false;

    const run = async () => {
      const index = items.findIndex(
        (item) => getContentKey(item) === focusedKey
      );
      if (index < 0) return;

      let ahead = options.ahead;
      if (ahead === undefined) {
        const focused = items[index];
        const hint =
          focused && typeof (focused as any).lite?.prefetchCount === "number"
            ? Math.max(0, Math.min(2, (focused as any).lite.prefetchCount))
            : undefined;
        const liteAhead = hint ?? getLitePrefetchAhead();
        if (liteAhead !== undefined) {
          ahead = liteAhead;
        } else {
          try {
            const quality = await detectNetworkQuality();
            const configured = PERFORMANCE_CONFIG.VIDEO.PRELOAD_DISTANCE ?? 2;
            ahead =
              quality.type === "excellent"
                ? configured
                : quality.type === "good"
                  ? Math.min(1, configured)
                  : 0;
          } catch {
            ahead = 1;
          }
        }
      }

      if (cancelled || !ahead) return;

      const skipHeavy = isLiteProfileActive();

      // Hard budget: max 2 videos + 1 audio (+ pdfs as light)
      const videoUrls: string[] = [];
      const audioUrls: string[] = [];
      const pdfUrls: string[] = [];

      for (let i = 1; i <= ahead; i += 1) {
        const candidates = [items[index + i], items[index - i]];
        for (const item of candidates) {
          if (!item) continue;

          if (isEbook(item)) {
            if (skipHeavy) continue;
            const pdf = getEbookUrl(item);
            if (pdf) pdfUrls.push(pdf);
            continue;
          }

          if (
            isAudioSermon(item) ||
            String(item.contentType).toLowerCase().includes("music") ||
            String(item.contentType).toLowerCase().includes("audio")
          ) {
            if (skipHeavy) continue;
            if (audioUrls.length >= 1) continue;
            const audio = getAudioUrl(item);
            if (audio) audioUrls.push(audio);
            continue;
          }

          if (videoUrls.length >= (skipHeavy ? 1 : 2)) continue;
          const url = getVideoUrlFromMedia(item);
          if (url) videoUrls.push(url);
        }
      }

      if (videoUrls.length > 0) prefetchVideoUrls(videoUrls);
      if (audioUrls.length > 0) prefetchAudioUrls(audioUrls);
      if (pdfUrls.length > 0) prefetchPdfUrls(pdfUrls.slice(0, 1));
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [focusedKey, items, getContentKey, options.ahead]);
}
