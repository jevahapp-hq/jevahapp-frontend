/**
 * useMediaCardModals Hook
 * Manages all modal states for media cards
 */

import { useContentActionModal } from "./useContentActionModal";
import { useMediaDeletion } from "./useMediaDeletion";
import { getMediaId, getMediaTitle } from "../utils/mediaHelpers";

interface UseMediaCardModalsOptions {
  mediaItem: any;
  onDelete?: (item: any) => void;
}

interface UseMediaCardModalsReturn {
  // Content action modal
  isActionModalVisible: boolean;
  openActionModal: () => void;
  closeActionModal: () => void;
  
  // Delete modal
  isOwner: boolean;
  showDeleteModal: boolean;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;
  handleDeletePress: () => void;
  handleDeleteConfirm: () => Promise<void>;
  
  // Modal props for components
  deleteModalProps: {
    visible: boolean;
    mediaId: string;
    mediaTitle: string;
    onClose: () => void;
    onSuccess: () => Promise<void>;
  };
}

/**
 * Hook to manage all modals for a media card
 */
export const useMediaCardModals = ({
  mediaItem,
  onDelete,
}: UseMediaCardModalsOptions): UseMediaCardModalsReturn => {
  const { isModalVisible, openModal, closeModal } = useContentActionModal();
  
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

  const handleDeletePress = () => {
    openDeleteModal();
  };

  const handleDeleteConfirm = async () => {
    closeDeleteModal();
    closeModal();
    onDelete?.(mediaItem);
  };

  const mediaId = getMediaId(mediaItem) || "";
  const mediaTitle = getMediaTitle(mediaItem);

  return {
    // Content action modal
    isActionModalVisible: isModalVisible,
    openActionModal: openModal,
    closeActionModal: closeModal,
    
    // Delete modal
    isOwner,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeletePress,
    handleDeleteConfirm,
    
    // Modal props for components
    deleteModalProps: {
      visible: showDeleteModal,
      mediaId,
      mediaTitle,
      onClose: closeDeleteModal,
      onSuccess: handleDeleteConfirm,
    },
  };
};

