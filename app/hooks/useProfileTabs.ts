import { useCallback, useEffect, useState } from "react";
import profileTabsService, {
  ProfileTabDescriptor,
  ProfileTabKey,
} from "../services/profileTabsService";

export function useProfileTabs(userId?: string) {
  const [tabs, setTabs] = useState<ProfileTabDescriptor[]>([]);
  const [user, setUser] = useState<{
    id: string;
    displayName?: string;
    avatarUrl?: string;
  } | null>(null);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [errorTabs, setErrorTabs] = useState<string | null>(null);

  const refreshTabs = useCallback(async () => {
    setLoadingTabs(true);
    setErrorTabs(null);
    try {
      const res = await profileTabsService.fetchTabs(userId);
      if (res?.success && Array.isArray(res.tabs)) {
        setTabs(res.tabs);
        if (res.user) setUser(res.user);
      } else {
        setErrorTabs("Failed to load tabs");
      }
    } catch (e: any) {
      setErrorTabs(e?.message || "Failed to load tabs");
    } finally {
      setLoadingTabs(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshTabs();
  }, [refreshTabs]);

  return { tabs, user, loadingTabs, errorTabs, refreshTabs } as const;
}

export function useProfileTabItems<T = any>(
  key: ProfileTabKey,
  opts: {
    userId?: string;
    page?: number;
    limit?: number;
    sort?: "recent" | "popular";
  } = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(opts.page || 1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (p = page) => {
      setLoading(true);
      setError(null);
      try {
        const res = await profileTabsService.fetchTabItems<T>(key, {
          ...opts,
          page: p,
        });
        if (res?.success && Array.isArray(res.items)) {
          setItems(
            p > 1 ? (prev) => [...prev, ...res.items] as any : res.items
          );
          setTotal(res.total || 0);
          setPage(res.page || p);
        } else {
          setError("Failed to load items");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load items");
      } finally {
        setLoading(false);
      }
    },
    [key, opts.userId, opts.limit, opts.sort, page]
  );

  const refresh = useCallback(async () => load(1), [load]);
  const loadMore = useCallback(async () => load(page + 1), [load, page]);

  useEffect(() => {
    load(1);
  }, [key]);

  return { items, total, page, loading, error, refresh, loadMore } as const;
}
