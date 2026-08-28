/**
 * Record a qualified ebook view while reading in PdfViewer.
 * Rules: ≥10s dwell OR ≥10% page progress OR last page.
 */
import { useEffect, useRef, useState } from "react";
import contentInteractionAPI from "../../utils/contentInteractionAPI";
import { qualifiesEbookView } from "../../utils/contentInteraction/viewQualification";

export function useEbookReaderViewTracking(options: {
  ebookId?: string | null;
  currentPage: number;
  totalPages: number;
}) {
  const { ebookId, currentPage, totalPages } = options;
  const startedAtRef = useRef(Date.now());
  const [hasTracked, setHasTracked] = useState(false);
  const inFlightRef = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    startedAtRef.current = Date.now();
    setHasTracked(false);
  }, [ebookId]);

  // Re-evaluate every 2s so dwell can qualify without page turns
  useEffect(() => {
    if (!ebookId || hasTracked) return;
    const interval = setInterval(() => setTick((n) => n + 1), 2000);
    return () => clearInterval(interval);
  }, [ebookId, hasTracked]);

  useEffect(() => {
    const id = String(ebookId || "").trim();
    if (!id || hasTracked || inFlightRef.current) return;

    const dwellMs = Date.now() - startedAtRef.current;
    const progressPct =
      totalPages > 0
        ? Math.round((Math.max(1, currentPage) / totalPages) * 100)
        : 0;
    const isComplete = totalPages > 0 && currentPage >= totalPages;

    if (!qualifiesEbookView({ dwellMs, progressPct, isComplete })) return;

    inFlightRef.current = true;
    void (async () => {
      try {
        const result = await contentInteractionAPI.recordView(id, "ebook", {
          durationMs: dwellMs,
          progressPct,
          isComplete,
          source: "reader",
        });
        if (result?.counted === false) return;
        setHasTracked(true);
        try {
          const {
            useInteractionStore,
          } = require("@/store/useInteractionStore");
          if (result?.totalViews != null) {
            useInteractionStore.getState().mutateStats?.(id, () => ({
              views: Number(result.totalViews) || 0,
            }));
          }
        } catch {
          // ignore
        }
      } catch {
        // ignore
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [ebookId, currentPage, totalPages, hasTracked, tick]);
}
