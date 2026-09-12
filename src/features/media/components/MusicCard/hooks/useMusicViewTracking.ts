/**
 * Qualified view tracking for music / audio / podcast playback.
 * Rules: ≥10s OR ≥20% OR complete (see viewQualification.ts).
 * Subscribes to the playback clock imperatively so the card does not
 * re-render on every position tick.
 */
import { useEffect, useRef, useState } from "react";
import contentInteractionAPI from "../../../../../../app/utils/contentInteractionAPI";
import {
  qualifiesPlaybackView,
  viewContentTypeForItem,
} from "../../../../../../app/utils/contentInteraction/viewQualification";
import {
  getAudioPlaybackClock,
  useAudioProgressStore,
} from "@/store/audioPlayer/audioProgressStore";

export function useMusicViewTracking(options: {
  contentId: string;
  contentType?: string;
  isPlaying: boolean;
}) {
  const { contentId, contentType, isPlaying } = options;
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const inFlightRef = useRef(false);
  const storeRef = useRef<any>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    hasTrackedRef.current = hasTrackedView;
  }, [hasTrackedView]);

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
    if (!contentId || !isPlaying || hasTrackedView) return;

    const tryRecord = () => {
      if (hasTrackedRef.current || inFlightRef.current) return;
      const clock = getAudioPlaybackClock();
      if (clock.trackId && clock.trackId !== contentId) return;

      const { qualifies, finished } = qualifiesPlaybackView({
        family: "audio",
        isPlaying: true,
        positionMs: clock.position || 0,
        progress: clock.progress || 0,
        durationMs: clock.duration || 0,
      });
      if (!qualifies) return;

      inFlightRef.current = true;
      void (async () => {
        try {
          const result = await contentInteractionAPI.recordView(
            contentId,
            viewContentTypeForItem(contentType),
            {
              durationMs: finished ? clock.duration : clock.position,
              progressPct: Math.round((clock.progress || 0) * 100),
              isComplete: finished,
            }
          );
          if (result?.counted === false) return;
          hasTrackedRef.current = true;
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
    };

    tryRecord();
    return useAudioProgressStore.subscribe(tryRecord);
  }, [contentId, contentType, isPlaying, hasTrackedView]);
}
