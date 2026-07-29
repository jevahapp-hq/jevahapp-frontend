/**
 * Records a qualified video view once per card mount (3s or 25% watched).
 */
import { useCallback, useRef } from "react";
import contentInteractionAPI from "../../../../../../app/utils/contentInteractionAPI";
import {
  qualifiesPlaybackView,
  viewContentTypeForItem,
} from "../../../../../../app/utils/contentInteraction/viewQualification";

export function useVideoViewTracking(params: {
  contentId: string;
  contentType?: string;
  hasTrackedView: boolean;
  setHasTrackedView: (v: boolean) => void;
  storeRef: React.MutableRefObject<any>;
  isMountedRef: React.MutableRefObject<boolean>;
}) {
  const {
    contentId,
    contentType,
    hasTrackedView,
    setHasTrackedView,
    storeRef,
    isMountedRef,
  } = params;
  const inFlightRef = useRef(false);

  const maybeRecordView = useCallback(
    (
      playerPlaying: boolean,
      positionMs: number,
      durationMs: number,
      progress: number
    ) => {
      if (hasTrackedView || inFlightRef.current || !isMountedRef.current) return;

      const { qualifies, finished } = qualifiesPlaybackView({
        family: "video",
        isPlaying: playerPlaying,
        positionMs,
        progress,
        durationMs,
      });
      if (!qualifies) return;

      inFlightRef.current = true;
      contentInteractionAPI
        .recordView(contentId, viewContentTypeForItem(contentType || "media"), {
          durationMs: finished ? durationMs : positionMs,
          progressPct: Math.round(progress * 100),
          isComplete: finished,
        })
        .then((result) => {
          if (result?.counted === false) return;
          setHasTrackedView(true);
          if (result?.totalViews != null && storeRef.current?.mutateStats) {
            storeRef.current.mutateStats(contentId, () => ({
              views: Number(result.totalViews) || 0,
            }));
          }
        })
        .catch(() => {})
        .finally(() => {
          inFlightRef.current = false;
        });
    },
    [
      contentId,
      contentType,
      hasTrackedView,
      setHasTrackedView,
      storeRef,
      isMountedRef,
    ]
  );

  return { maybeRecordView };
}
