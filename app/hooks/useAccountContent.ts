import { useEffect, useMemo, useState } from "react";

type AccountAnalytics = {
  total?: number;
  likes?: number;
  liveSessions?: number;
  comments?: number;
  drafts?: number;
  shares?: number;
};

type UseAccountContentResult = {
  posts: any[];
  media: any[];
  videos: any[];
  analytics: AccountAnalytics;
  loading: boolean;
};

// Lightweight, safe hook so Account screen never crashes if data sources are unavailable
export function useAccountContent(): UseAccountContentResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AccountAnalytics>({
    total: 0,
    likes: 0,
    liveSessions: 0,
    comments: 0,
    drafts: 0,
    shares: 0,
  });

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        setLoading(true);
        // TODO: Replace with real data sources (store/API) when ready
        if (cancelled) return;
        setPosts([]);
        setMedia([]);
        setVideos([]);
        setAnalytics((prev) => ({ ...prev }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const result = useMemo<UseAccountContentResult>(
    () => ({
      posts,
      media,
      videos,
      analytics,
      loading,
    }),
    [posts, media, videos, analytics, loading]
  );

  return result;
}

export default useAccountContent;






















