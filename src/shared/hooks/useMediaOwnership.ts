/**
 * useMediaOwnership Hook
 * Reusable hook for checking media ownership across components
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useDeleteMedia } from "../../../app/hooks/useDeleteMedia";
import { canViewerDeleteMedia } from "../media/moderationVisibility";
import { getUploadedBy } from "../utils/mediaHelpers";

interface UseMediaOwnershipOptions {
  mediaItem: any;
  isModalVisible?: boolean;
  checkOnModalOpen?: boolean;
  /** Logged-in viewer id — sync owner check so Delete is ready when the menu opens. */
  viewerId?: string | null;
}

interface UseMediaOwnershipReturn {
  isOwner: boolean;
  isLoading: boolean;
  checkOwnership: () => Promise<void>;
}

/**
 * Hook to check if the current user owns a media item.
 * Prefer the synchronous viewerId path so under-review cards can show Delete
 * immediately; fall back to the async storage check when viewerId is unknown.
 */
export const useMediaOwnership = ({
  mediaItem,
  isModalVisible = false,
  checkOnModalOpen = true,
  viewerId,
}: UseMediaOwnershipOptions): UseMediaOwnershipReturn => {
  const syncOwner = useMemo(
    () => canViewerDeleteMedia(mediaItem, viewerId),
    [mediaItem, viewerId]
  );
  const [asyncOwner, setAsyncOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { checkOwnership } = useDeleteMedia();

  const performOwnershipCheck = useCallback(async () => {
    if (!mediaItem) {
      setAsyncOwner(false);
      return;
    }

    setIsLoading(true);
    try {
      const uploadedBy = getUploadedBy(mediaItem);
      const result = await checkOwnership(uploadedBy, mediaItem);
      setAsyncOwner(result);
    } catch (error) {
      console.error("❌ Ownership check failed:", error);
      setAsyncOwner(false);
    } finally {
      setIsLoading(false);
    }
  }, [mediaItem, checkOwnership]);

  useEffect(() => {
    if (viewerId) {
      setAsyncOwner(false);
      return;
    }
    if (checkOnModalOpen && isModalVisible) {
      void performOwnershipCheck();
    }
  }, [isModalVisible, checkOnModalOpen, performOwnershipCheck, viewerId]);

  return {
    isOwner: viewerId ? syncOwner : asyncOwner,
    isLoading,
    checkOwnership: performOwnershipCheck,
  };
};

