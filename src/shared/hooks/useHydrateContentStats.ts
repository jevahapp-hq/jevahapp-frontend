import { useEffect } from "react";

export function useHydrateContentStats(contentId?: string, contentType: string = "media") {
  useEffect(() => {
    if (!contentId) return;
    try {
      const { useInteractionStore } = require("../../../app/store/useInteractionStore");
      const loadContentStats = useInteractionStore.getState()
        .loadContentStats as (id: string, type?: string) => Promise<void>;
      loadContentStats(String(contentId), contentType).catch(() => {});
    } catch {}
  }, [contentId, contentType]);
}


