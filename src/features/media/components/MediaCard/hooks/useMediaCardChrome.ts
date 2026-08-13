/**
 * Shared chrome for Video / Music / Ebook feed cards.
 * Single responsibility: deletion, action sheet, report/details, admin.
 */
import { useCallback, useEffect, useState } from "react";
import { isAdmin } from "../../../../../../app/utils/mediaDeleteAPI";
import { useMediaDeletion } from "../../../../../shared/hooks";
import { useContentActionModal } from "../../../../../shared/hooks/useContentActionModal";
import type { MediaItem } from "../../../../../shared/types";

export function useMediaCardChrome(options: {
  item: MediaItem;
  /** When true, also treat parent `modalVisible === modalKey` as open (Video feed). */
  parentModalOpen?: boolean;
  onDelete?: (item: MediaItem) => void;
  checkAdmin?: boolean;
}) {
  const { item, parentModalOpen = false, onDelete, checkAdmin = true } = options;

  const [showReportModal, setShowReportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  const { isModalVisible, openModal, closeModal } = useContentActionModal();

  useEffect(() => {
    if (!checkAdmin) return;
    isAdmin()
      .then(setUserIsAdmin)
      .catch(() => setUserIsAdmin(false));
  }, [checkAdmin]);

  const {
    isOwner,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
  } = useMediaDeletion({
    mediaItem: item,
    isModalVisible: isModalVisible || parentModalOpen,
    onDeleteSuccess: (deleted) => {
      closeModal();
      onDelete?.(deleted);
    },
  });

  const handleDeletePress = useCallback(() => {
    openDeleteModal();
  }, [openDeleteModal]);

  const handleDeleteConfirm = useCallback(async () => {
    closeDeleteModal();
    closeModal();
    onDelete?.(item);
  }, [item, closeDeleteModal, closeModal, onDelete]);

  return {
    isModalVisible,
    openModal,
    closeModal,
    showReportModal,
    setShowReportModal,
    showDetailsModal,
    setShowDetailsModal,
    userIsAdmin,
    isOwner,
    showDeleteModal,
    closeDeleteModal,
    handleDeletePress,
    handleDeleteConfirm,
  };
}
