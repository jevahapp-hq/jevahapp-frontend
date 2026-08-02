import { useCallback, useEffect, useState } from "react";
import { mediaApi } from "../../core/api/MediaApi";

export function useContentStats(contentIds: string[], contentType?: string) {
  const [stats, setStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (contentIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await mediaApi.batchGetContentStats(
        contentIds,
        contentType
      );

      if (response.success) {
        setStats(response.data || {});
      } else {
        setError(response.error || "Failed to load stats");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [contentIds, contentType]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, refresh: loadStats };
}
