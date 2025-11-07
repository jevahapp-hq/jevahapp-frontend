/**
 * useMediaOwnership Hook
 * Reusable hook for checking media ownership across components
 */

import { useState, useEffect, useCallback } from "react";
import { useDeleteMedia } from "../../../app/hooks/useDeleteMedia";
import { getUploadedBy } from "../utils/mediaHelpers";

interface UseMediaOwnershipOptions {
  mediaItem: any;
  isModalVisible?: boolean;
  checkOnModalOpen?: boolean;
}

interface UseMediaOwnershipReturn {
  isOwner: boolean;
  isLoading: boolean;
  checkOwnership: () => Promise<void>;
}

/**
 * Hook to check if the current user owns a media item
 * Automatically checks ownership when modal opens (if checkOnModalOpen is true)
 */
export const useMediaOwnership = ({
  mediaItem,
  isModalVisible = false,
  checkOnModalOpen = true,
}: UseMediaOwnershipOptions): UseMediaOwnershipReturn => {
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { checkOwnership } = useDeleteMedia();

  const performOwnershipCheck = useCallback(async () => {
    if (!mediaItem) {
      setIsOwner(false);
      return;
    }

    setIsLoading(true);
    try {
      const uploadedBy = getUploadedBy(mediaItem);
      const result = await checkOwnership(uploadedBy, mediaItem);
      setIsOwner(result);
    } catch (error) {
      console.error("❌ Ownership check failed:", error);
      setIsOwner(false);
    } finally {
      setIsLoading(false);
    }
  }, [mediaItem, checkOwnership]);

  // Auto-check ownership when modal opens
  useEffect(() => {
    if (checkOnModalOpen && isModalVisible) {
      performOwnershipCheck();
    } else if (!isModalVisible) {
      // Reset when modal closes
      setIsOwner(false);
    }
  }, [isModalVisible, checkOnModalOpen, performOwnershipCheck]);

  return {
    isOwner,
    isLoading,
    checkOwnership: performOwnershipCheck,
  };
};

