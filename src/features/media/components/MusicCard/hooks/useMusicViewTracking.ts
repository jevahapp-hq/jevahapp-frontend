/**
 * Qualified view tracking for music / audio / podcast playback.
 * Rules: ≥10s OR ≥20% OR complete (see viewQualification.ts).
 */
import { useEffect, useRef, useState } from "react";
import contentInteractionAPI from "../../../../../../app/utils/contentInteractionAPI";
import {
  qualifiesPlaybackView,
  viewContentTypeForItem,
} from "../../../../../../app/utils/contentInteraction/viewQualification";

export function useMusicViewTracking(options: {
  contentId: string;
  contentType?: string;
  isPlaying: boolean;
  positionMs: number;
  progress: number;
  durationMs: number;
}) {
  const {
    contentId,
    contentType,
    isPlaying,
    positionMs,
    progress,
    durationMs,
  } = options;
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const inFlightRef = useRef(false);
  const storeRef = useRef<any>(null);

  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("@/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!contentId || hasTrackedView || inFlightRef.current) return;

    const { qualifies, finished } = qualifiesPlaybackView({
      family: "audio",
      isPlaying,
      positionMs,
      progress,
      durationMs,
    });
    if (!qualifies) return;

    inFlightRef.current = true;
    void (async () => {
      try {
        const result = await contentInteractionAPI.recordView(
          contentId,
          viewContentTypeForItem(contentType),
          {
            durationMs: finished ? durationMs : positionMs,
            progressPct: Math.round((progress || 0) * 100),
            isComplete: finished,
          }
        );
        if (result?.counted === false) return;
        setHasTrackedView(true);
        if (result?.totalViews != null && storeRef.current?.mutateStats) {
          storeRef.current.mutateStats(contentId, () => ({
            views: Number(result.totalViews) || 0,
          }));
        }
      } catch {
        // ignore
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [
    contentId,
    contentType,
    isPlaying,
    positionMs,
    progress,
    durationMs,
    hasTrackedView,
  ]);
}
