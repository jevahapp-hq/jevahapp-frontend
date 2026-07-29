/**
 * Ebook feed card: record view after ≥10s on-screen (or earlier if caller
 * already has read progress). Syncs interaction store when counted.
 */
import { useEffect, useRef, useState } from "react";
import contentInteractionAPI from "../../../../../../app/utils/contentInteractionAPI";
import {
  qualifiesEbookView,
  VIEW_QUALIFICATION,
} from "../../../../../../app/utils/contentInteraction/viewQualification";

const DWELL_MS = VIEW_QUALIFICATION.ebook.minMs;

export function useEbookViewTracking(contentId: string) {
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const inFlightRef = useRef(false);
  const storeRef = useRef<any>(null);

  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../../../app/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!contentId || hasTrackedView) return;

    const t = setTimeout(async () => {
      if (hasTrackedView || inFlightRef.current || !contentId) return;
      if (
        !qualifiesEbookView({
          dwellMs: DWELL_MS,
          progressPct: 0,
        })
      ) {
        return;
      }

      inFlightRef.current = true;
      try {
        const result = await contentInteractionAPI.recordView(
          contentId,
          "ebook",
          {
            durationMs: DWELL_MS,
            progressPct: 0,
            isComplete: false,
            source: "feed",
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
    }, DWELL_MS);

    return () => clearTimeout(t);
  }, [contentId, hasTrackedView]);
}
