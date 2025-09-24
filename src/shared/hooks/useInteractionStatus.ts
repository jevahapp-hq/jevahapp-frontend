import { useCallback, useEffect, useState } from "react";
import { mediaApi } from "../../core/api/MediaApi";

interface InteractionStatus {
  liked: boolean;
  likeCount: number;
  saved: boolean;
  saveCount: number;
  loading: boolean;
  error: string | null;
}

interface UseInteractionStatusOptions {
  contentType: string;
  contentId: string;
  initialLiked?: boolean;
  initialLikeCount?: number;
  initialSaved?: boolean;
  initialSaveCount?: number;
  autoLoad?: boolean;
}

export const useInteractionStatus = ({
  contentType,
  contentId,
  initialLiked = false,
  initialLikeCount = 0,
  initialSaved = false,
  initialSaveCount = 0,
  autoLoad = true,
}: UseInteractionStatusOptions) => {
  const [status, setStatus] = useState<InteractionStatus>({
    liked: initialLiked,
    likeCount: initialLikeCount,
    saved: initialSaved,
    saveCount: initialSaveCount,
    loading: false,
    error: null,
  });

  const loadStatus = useCallback(async () => {
    if (!contentId) return;

    setStatus((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Load like status and bookmark status in parallel
      const [likeStatusResult, bookmarkStatusResult] = await Promise.allSettled(
        [
          mediaApi.getActionStatus(contentId),
          mediaApi.getBookmarkStatus(contentId),
        ]
      );

      const newStatus: Partial<InteractionStatus> = {};

      // Handle like status
      if (
        likeStatusResult.status === "fulfilled" &&
        likeStatusResult.value.success
      ) {
        const likeData = likeStatusResult.value.data;
        newStatus.liked =
          likeData?.isFavorited ?? likeData?.liked ?? initialLiked;
        newStatus.likeCount = likeData?.likeCount ?? initialLikeCount;
      } else {
        console.warn(
          "Failed to load like status:",
          likeStatusResult.status === "rejected"
            ? likeStatusResult.reason
            : likeStatusResult.value.error
        );
        newStatus.liked = initialLiked;
        newStatus.likeCount = initialLikeCount;
      }

      // Handle bookmark status
      if (
        bookmarkStatusResult.status === "fulfilled" &&
        bookmarkStatusResult.value.success
      ) {
        const bookmarkData = bookmarkStatusResult.value.data;
        newStatus.saved =
          bookmarkData?.isBookmarked ?? bookmarkData?.saved ?? initialSaved;
        newStatus.saveCount =
          bookmarkData?.bookmarkCount ??
          bookmarkData?.saveCount ??
          initialSaveCount;
      } else {
        console.warn(
          "Failed to load bookmark status:",
          bookmarkStatusResult.status === "rejected"
            ? bookmarkStatusResult.reason
            : bookmarkStatusResult.value.error
        );
        newStatus.saved = initialSaved;
        newStatus.saveCount = initialSaveCount;
      }

      setStatus((prev) => ({
        ...prev,
        ...newStatus,
        loading: false,
      }));
    } catch (error: any) {
      console.error("Failed to load interaction status:", error);
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to load status",
      }));
    }
  }, [
    contentId,
    contentType,
    initialLiked,
    initialLikeCount,
    initialSaved,
    initialSaveCount,
  ]);

  const updateLikeStatus = useCallback((liked: boolean, likeCount: number) => {
    setStatus((prev) => ({
      ...prev,
      liked,
      likeCount,
    }));
  }, []);

  const updateSaveStatus = useCallback((saved: boolean, saveCount?: number) => {
    setStatus((prev) => ({
      ...prev,
      saved,
      saveCount: saveCount ?? prev.saveCount,
    }));
  }, []);

  // Auto-load status on mount if enabled
  useEffect(() => {
    if (autoLoad && contentId) {
      loadStatus();
    }
  }, [autoLoad, contentId, loadStatus]);

  return {
    ...status,
    loadStatus,
    updateLikeStatus,
    updateSaveStatus,
    refresh: loadStatus,
  };
};
