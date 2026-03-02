/**
 * useMediaCardActions Hook
 * Unified hook for all media card action handlers
 */

import { useCallback } from "react";
import { useContentActionModal } from "./useContentActionModal";
import { useMediaDeletion } from "./useMediaDeletion";
import { getMediaId, getMediaTitle, getUploadedBy } from "../utils/mediaHelpers";

interface UseMediaCardActionsOptions {
  mediaItem: any;
  onLike?: (key: string, item: any) => void;
  onComment?: (key: string, item: any) => void;
  onSave?: (key: string, item: any) => void;
  onShare?: (key: string, item: any) => void;
  onDownload?: (item: any) => void;
  onDelete?: (item: any) => void;
  onViewDetails?: () => void;
  index?: number;
}

interface UseMediaCardActionsReturn {
  // Modal state
  isModalVisible: boolean;
  openModal: () => void;
  closeModal: () => void;
  
  // Delete functionality
  isOwner: boolean;
  showDeleteModal: boolean;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;
  handleDeletePress: () => void;
  handleDeleteConfirm: () => Promise<void>;
  
  // Action handlers
  handleLike: (key: string) => void;
  handleComment: (key: string) => void;
  handleSave: (key: string) => void;
  handleShare: (key: string) => void;
  handleDownload: () => void;
  handleViewDetails: () => void;
  
  // Generated keys
  modalKey: string;
  contentId: string;
}

/**
 * Comprehensive hook for media card actions
 * Centralizes all action handlers and modal management
 */
export const useMediaCardActions = ({
  mediaItem,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
  onDelete,
  onViewDetails,
  index = 0,
}: UseMediaCardActionsOptions): UseMediaCardActionsReturn => {
  const { isModalVisible, openModal, closeModal } = useContentActionModal();
  
  // Generate consistent keys
  const mediaId = getMediaId(mediaItem);
  const mediaType = mediaItem?.contentType?.toLowerCase() || "media";
  const modalKey = `${mediaType}-${mediaId || index}`;
  const contentId = mediaId || `${mediaType}-${index}`;

  // Delete functionality
  const {
    isOwner,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
  } = useMediaDeletion({
    mediaItem,
    isModalVisible,
    onDeleteSuccess: (deletedItem) => {
      closeModal();
      onDelete?.(deletedItem);
    },
  });

  // Action handlers
  const handleLike = useCallback(
    (key: string) => {
      onLike?.(key, mediaItem);
    },
    [onLike, mediaItem]
  );

  const handleComment = useCallback(
    (key: string) => {
      onComment?.(key, mediaItem);
    },
    [onComment, mediaItem]
  );

  const handleSave = useCallback(
    (key: string) => {
      onSave?.(key, mediaItem);
    },
    [onSave, mediaItem]
  );

  const handleShare = useCallback(
    (key: string) => {
      onShare?.(key, mediaItem);
    },
    [onShare, mediaItem]
  );

  const handleDownload = useCallback(() => {
    onDownload?.(mediaItem);
  }, [onDownload, mediaItem]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.();
  }, [onViewDetails]);

  const handleDeletePress = useCallback(() => {
    openDeleteModal();
  }, [openDeleteModal]);

  const handleDeleteConfirm = useCallback(async () => {
    closeDeleteModal();
    closeModal();
    onDelete?.(mediaItem);
  }, [mediaItem, closeDeleteModal, closeModal, onDelete]);

  return {
    // Modal state
    isModalVisible,
    openModal,
    closeModal,
    
    // Delete functionality
    isOwner,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeletePress,
    handleDeleteConfirm,
    
    // Action handlers
    handleLike,
    handleComment,
    handleSave,
    handleShare,
    handleDownload,
    handleViewDetails,
    
    // Generated keys
    modalKey,
    contentId,
  };
};

