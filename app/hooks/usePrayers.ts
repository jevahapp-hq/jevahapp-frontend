// Prayer Wall Hooks
import { useState, useEffect, useCallback } from "react";
import { communityAPI, PrayerRequest, CreatePrayerRequest } from "../utils/communityAPI";
import { ApiErrorHandler, ApiError } from "../utils/apiErrorHandler";

export function usePrayers() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);

  const loadPrayers = useCallback(
    async (reset = false) => {
      // Allow reset to bypass loading and hasMore checks
      if (!reset && (loading || !hasMore)) return;

      try {
        setLoading(true);
        setError(null);
        const currentPage = reset ? 1 : page;
        console.log("🔄 Loading prayers - page:", currentPage, "reset:", reset);
        
        const response = await communityAPI.getPrayers({
          page: currentPage,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        console.log("📥 Prayer API response:", {
          success: response.success,
          hasData: !!response.data,
          prayersCount: response.data?.prayers?.length || 0,
          error: response.error,
        });

        if (response.success && response.data) {
          const { prayers: newPrayers, pagination } = response.data;
          console.log("✅ Setting prayers:", newPrayers.length, "items");
          console.log("📊 Pagination:", pagination);
          
          if (reset) {
            setPrayers(newPrayers);
          } else {
            setPrayers((prev) => [...prev, ...newPrayers]);
          }

          // Ensure hasMore is properly set (default to true if undefined)
          setHasMore(pagination.hasMore !== undefined ? pagination.hasMore : true);
          setPage(currentPage + 1);
        } else {
          console.error("❌ Failed to load prayers:", response.error);
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
        }
      } catch (err: any) {
        console.error("❌ Exception loading prayers:", err);
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
      } finally {
        setLoading(false);
        console.log("✅ Loading complete, loading set to false");
      }
    },
    [page, loading, hasMore]
  );

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadPrayers(true);
  }, [loadPrayers]);

  const createPrayer = useCallback(
    async (prayerData: CreatePrayerRequest) => {
      try {
        console.log("📝 Creating prayer with data:", {
          prayerText: prayerData.prayerText?.substring(0, 50) + "...",
          color: prayerData.color,
          shape: prayerData.shape,
        });
        
        setLoading(true);
        setError(null);
        const response = await communityAPI.createPrayer(prayerData);
        
        console.log("📥 Create prayer API response:", {
          success: response.success,
          hasData: !!response.data,
          prayerId: response.data?._id,
          error: response.error,
        });
        
        if (response.success && response.data) {
          console.log("✅ Prayer created successfully:", response.data._id);
          setPrayers((prev) => [response.data!, ...prev]);
          return response.data;
        } else {
          console.error("❌ Failed to create prayer:", response.error);
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        console.error("❌ Exception creating prayer:", err);
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const likePrayer = useCallback(
    async (prayerId: string, currentLiked: boolean, currentLikesCount: number) => {
      // Optimistic update
      setPrayers((prev) =>
        prev.map((prayer) =>
          prayer._id === prayerId
            ? {
                ...prayer,
                userLiked: !currentLiked,
                likesCount: currentLiked
                  ? currentLikesCount - 1
                  : currentLikesCount + 1,
              }
            : prayer
        )
      );

      try {
        const response = await communityAPI.likePrayer(prayerId);
        if (response.success && response.data) {
          // Update with actual server response
          setPrayers((prev) =>
            prev.map((prayer) =>
              prayer._id === prayerId
                ? {
                    ...prayer,
                    userLiked: response.data!.liked,
                    likesCount: response.data!.likesCount,
                  }
                : prayer
            )
          );
          return response.data;
        } else {
          // Revert optimistic update on error
          setPrayers((prev) =>
            prev.map((prayer) =>
              prayer._id === prayerId
                ? {
                    ...prayer,
                    userLiked: currentLiked,
                    likesCount: currentLikesCount,
                  }
                : prayer
            )
          );
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        // Revert optimistic update on error
        setPrayers((prev) =>
          prev.map((prayer) =>
            prayer._id === prayerId
              ? {
                  ...prayer,
                  userLiked: currentLiked,
                  likesCount: currentLikesCount,
                }
              : prayer
          )
        );
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      }
    },
    []
  );

  useEffect(() => {
    loadPrayers(true);
  }, []);

  return {
    prayers,
    loading,
    error,
    hasMore,
    loadMore: () => loadPrayers(false),
    refresh,
    createPrayer,
    likePrayer,
  };
}

export function useSearchPrayers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const search = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.searchPrayers({
          query: searchQuery,
          page: 1,
          limit: 20,
        });

        if (response.success && response.data) {
          setResults(response.data.prayers);
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          setResults([]);
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        search(query);
      } else {
        setResults([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, search]);

  return { query, setQuery, results, loading, error, search };
}

