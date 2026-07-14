/**
 * Records a qualified view once per card mount (3s or 25% watched).
 */
import { useCallback, useRef } from "react";
import contentInteractionAPI from "../../../../../../app/utils/contentInteractionAPI";

export function useVideoViewTracking(params: {
  contentId: string;
  hasTrackedView: boolean;
  setHasTrackedView: (v: boolean) => void;
  storeRef: React.MutableRefObject<any>;
  isMountedRef: React.MutableRefObject<boolean>;
}) {
  const {
    contentId,
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

      const qualifies =
        playerPlaying && (positionMs >= 3000 || progress >= 0.25);
      const finished =
        durationMs > 0 && positionMs >= Math.max(0, durationMs - 250);

      if (!qualifies && !finished) return;

      inFlightRef.current = true;
      contentInteractionAPI
        .recordView(contentId, "media", {
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
      hasTrackedView,
      setHasTrackedView,
      storeRef,
      isMountedRef,
    ]
  );

  return { maybeRecordView };
}
