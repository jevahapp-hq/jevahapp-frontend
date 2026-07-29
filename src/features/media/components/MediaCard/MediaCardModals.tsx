/**
 * Shared modal quartet for media cards.
 */
import React from "react";
import { DeleteMediaConfirmation } from "../../../../../app/components/DeleteMediaConfirmation";
import ContentActionModal from "../../../../shared/components/ContentActionModal";
import MediaDetailsModal from "../../../../shared/components/MediaDetailsModal";
import ReportMediaModal from "../../../../shared/components/ReportMediaModal";
import type { MediaItem } from "../../../../shared/types";
import { getUploadedBy } from "../../../../shared/utils";

export interface MediaCardModalsProps {
  item: MediaItem;
  isModalVisible: boolean;
  closeModal: () => void;
  setShowDetailsModal: (v: boolean) => void;
  onSave: () => void;
  onDownload: () => void;
  isSaved: boolean;
  isDownloaded: boolean;
  handleDeletePress: () => void;
  showDelete: boolean;
  showDeleteModal: boolean;
  closeDeleteModal: () => void;
  handleDeleteConfirm: () => void;
  showReportModal: boolean;
  setShowReportModal: (v: boolean) => void;
  showDetailsModal: boolean;
  /** Optional: close parent feed modal key */
  onParentModalClose?: () => void;
}

export function MediaCardModals({
  item,
  isModalVisible,
  closeModal,
  setShowDetailsModal,
  onSave,
  onDownload,
  isSaved,
  isDownloaded,
  handleDeletePress,
  showDelete,
  showDeleteModal,
  closeDeleteModal,
  handleDeleteConfirm,
  showReportModal,
  setShowReportModal,
  showDetailsModal,
  onParentModalClose,
}: MediaCardModalsProps) {
  const closeAll = () => {
    closeModal();
    onParentModalClose?.();
  };

  return (
    <>
      <ContentActionModal
        isVisible={isModalVisible}
        onClose={closeAll}
        onViewDetails={() => {
          closeModal();
          setShowDetailsModal(true);
        }}
        onSaveToLibrary={onSave}
        onDownload={onDownload}
        isSaved={isSaved}
        isDownloaded={isDownloaded}
        contentTitle={item.title}
        mediaId={item._id}
        uploadedBy={
          getUploadedBy(item) ||
          item.uploadedBy ||
          (item as any).author?._id ||
          (item as any).authorInfo?._id
        }
        mediaItem={item}
        onDelete={handleDeletePress}
        showDelete={showDelete}
        onReport={() => setShowReportModal(true)}
      />
      <DeleteMediaConfirmation
        visible={showDeleteModal}
        mediaId={item._id || ""}
        mediaTitle={item.title || "this media"}
        onClose={closeDeleteModal}
        onSuccess={handleDeleteConfirm}
        isAdmin={false}
      />
      <ReportMediaModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        mediaId={item._id || ""}
        mediaTitle={item.title}
      />
      <MediaDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        mediaItem={item}
      />
    </>
  );
}
