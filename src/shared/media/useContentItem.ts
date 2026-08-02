import { useCallback, useEffect, useState } from "react";
import { mediaApi } from "../../core/api/MediaApi";
import type { MediaItem } from "../types";
import { transformApiResponseToMediaItem } from "../utils";

export function useContentItem(contentId: string) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!contentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await mediaApi.getContentById(contentId);

      if (response.success && response.data) {
        setItem(transformApiResponseToMediaItem(response.data));
      } else {
        setError(response.error || "Failed to load content");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  return { item, loading, error, refresh: loadItem };
}
