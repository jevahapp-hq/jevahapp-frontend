import { useEffect } from "react";

export function useHydrateContentStats(contentId?: string, contentType: string = "media") {
  useEffect(() => {
    if (!contentId) return;
    
    try {
      const { useInteractionStore } = require("../../../app/store/useInteractionStore");
      const store = useInteractionStore.getState();
      const contentIdStr = String(contentId);
      
      // ✅ Only hydrate if stats don't exist (fresh load)
      // This prevents overwriting optimistic updates after toggles
      const existingStats = store.contentStats[contentIdStr];
      if (existingStats) {
        // Stats already exist, skip hydration to preserve optimistic updates
        return;
      }
      
      // ✅ Check if there's an active interaction in progress
      const likeKey = `${contentIdStr}_like`;
      const saveKey = `${contentIdStr}_save`;
      const hasActiveLike = store.loadingInteraction[likeKey] === true;
      const hasActiveSave = store.loadingInteraction[saveKey] === true;
      
      // ✅ Skip hydration if there's an active interaction (prevents overwriting optimistic updates)
      if (hasActiveLike || hasActiveSave) {
        return;
      }
      
      const loadContentStats = store.loadContentStats as (id: string, type?: string) => Promise<void>;
      loadContentStats(contentIdStr, contentType).catch(() => {});
    } catch {}
  }, [contentId, contentType]);
}


