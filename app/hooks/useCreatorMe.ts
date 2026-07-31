/**
 * Poll / hydrate creator session. Soft-fails to apply CTA if API missing.
 */
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { creatorsApi } from "../services/creators";
import type { CreatorMe } from "../services/creators/types";
import { emptyCreatorMe } from "../services/creators/types";

export function useCreatorMe(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  const [data, setData] = useState<CreatorMe | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const me = await creatorsApi.getMe();
      setData(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load creator status");
      setData(emptyCreatorMe());
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  useFocusEffect(
    useCallback(() => {
      if (enabled) void refresh();
    }, [enabled, refresh])
  );

  return {
    data: data ?? emptyCreatorMe(),
    loading,
    error,
    refresh,
    setData,
  };
}
