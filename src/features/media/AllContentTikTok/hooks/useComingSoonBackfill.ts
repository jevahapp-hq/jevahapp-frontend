import { useEffect, useRef } from "react";
import type { ContentType } from "../../../../shared/types";

export function useComingSoonBackfill(options: {
  liteActive: boolean;
  activeTab: ContentType | "ALL";
  restLength: number;
  filteredCount: number;
  hasMoreDefaultPages: boolean;
  isLoadingMore: boolean;
  loadMoreContent: () => void;
}) {
  const {
    liteActive,
    activeTab,
    restLength,
    filteredCount,
    hasMoreDefaultPages,
    isLoadingMore,
    loadMoreContent,
  } = options;

  useEffect(() => {
    if (liteActive) return;
    if (activeTab !== "ALL" && activeTab !== "live") return;
    if (restLength >= 12) return;
    if (!hasMoreDefaultPages || isLoadingMore) return;
    loadMoreContent();
  }, [
    liteActive,
    activeTab,
    restLength,
    hasMoreDefaultPages,
    isLoadingMore,
    loadMoreContent,
  ]);

  const forcedComingSoonLoadRef = useRef(false);
  useEffect(() => {
    if (liteActive) return;
    if (activeTab !== "ALL" && activeTab !== "live") {
      forcedComingSoonLoadRef.current = false;
      return;
    }
    if (restLength > 0) {
      forcedComingSoonLoadRef.current = false;
      return;
    }
    if (forcedComingSoonLoadRef.current) return;
    if (filteredCount < 5) return;
    if (isLoadingMore || !hasMoreDefaultPages) return;
    forcedComingSoonLoadRef.current = true;
    loadMoreContent();
  }, [
    liteActive,
    activeTab,
    restLength,
    filteredCount,
    isLoadingMore,
    hasMoreDefaultPages,
    loadMoreContent,
  ]);
}
