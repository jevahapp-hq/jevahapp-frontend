/**
 * useMediaDeletion Hook
 * Reusable hook that combines ownership checking and deletion logic
 */

import { useState, useCallback } from "react";
import { useDeleteMedia } from "../../../app/hooks/useDeleteMedia";
import { useMediaOwnership } from "./useMediaOwnership";
import { deleteVisibleMedia } from "../../../app/utils/mediaDelete/deleteOperations";
import { getMediaId } from "../utils/mediaHelpers";

interface UseMediaDeletionOptions {
  mediaItem: any;
  isModalVisible?: boolean;
  onDeleteSuccess?: (mediaItem: any) => void;
  onDeleteError?: (error: string) => void;
  viewerId?: string | null;
}

interface UseMediaDeletionReturn {
  isOwner: boolean;
  isLoading: boolean;
  isDeleting: boolean;
  showDeleteModal: boolean;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;
  handleDeleteConfirm: () => Promise<void>;
  checkOwnership: () => Promise<void>;
}

/**
 * Comprehensive hook for media deletion functionality
 * Handles ownership checking, delete modal state, and deletion logic
 */
export const useMediaDeletion = ({
  mediaItem,
  isModalVisible = false,
  onDeleteSuccess,
  onDeleteError,
  viewerId,
}: UseMediaDeletionOptions): UseMediaDeletionReturn => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { isLoading: isDeleting } = useDeleteMedia();
  
  // Use ownership hook
  const { isOwner, isLoading: isCheckingOwnership, checkOwnership } = useMediaOwnership({
    mediaItem,
    isModalVisible,
    checkOnModalOpen: true,
    viewerId,
  });

  const openDeleteModal = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const mediaId = getMediaId(mediaItem);
    if (!mediaId && !mediaItem) {
      const error = "Media ID not found";
      console.error("❌", error);
      onDeleteError?.(error);
      return;
    }

    try {
      await deleteVisibleMedia(mediaItem, mediaId);
      setShowDeleteModal(false);
      onDeleteSuccess?.(mediaItem);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to delete media";
      console.error("❌ Delete failed:", errorMessage);
      onDeleteError?.(errorMessage);
    }
  }, [mediaItem, onDeleteSuccess, onDeleteError]);

  return {
    isOwner,
    isLoading: isCheckingOwnership,
    isDeleting,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteConfirm,
    checkOwnership,
  };
};

