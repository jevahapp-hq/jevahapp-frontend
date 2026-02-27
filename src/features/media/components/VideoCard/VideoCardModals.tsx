/**
 * VideoCardModals - Content action, delete, report, and details modals
 */
import React from "react";
import { DeleteMediaConfirmation } from "../../../../../app/components/DeleteMediaConfirmation";
import ContentActionModal from "../../../../shared/components/ContentActionModal";
import MediaDetailsModal from "../../../../shared/components/MediaDetailsModal";
import ReportMediaModal from "../../../../shared/components/ReportMediaModal";
import { getUploadedBy } from "../../../../shared/utils";
import type { MediaItem } from "../../../../shared/types";

export interface VideoCardModalsProps {
  isModalVisible: boolean;
  modalVisible: string | null;
  modalKey: string;
  onModalToggle: ((val: string | null) => void) | undefined;
  closeModal: () => void;
  setShowDetailsModal: (v: boolean) => void;
  onSave: (key: string, item: MediaItem) => void;
  video: MediaItem;
  contentStats: Record<string, any>;
  contentId: string;
  checkIfDownloaded: (id: string | undefined) => boolean;
  handleDeletePress: () => void;
  userIsAdmin: boolean;
  isOwner: boolean;
  showDeleteModal: boolean;
  closeDeleteModal: () => void;
  handleDeleteConfirm: () => void;
  showReportModal: boolean;
  setShowReportModal: (v: boolean) => void;
  showDetailsModal: boolean;
  onDownload: (item: MediaItem) => void;
}

export function VideoCardModals({
  isModalVisible,
  modalVisible,
  modalKey,
  onModalToggle,
  closeModal,
  setShowDetailsModal,
  onSave,
  video,
  contentStats,
  contentId,
  checkIfDownloaded,
  handleDeletePress,
  userIsAdmin,
  isOwner,
  showDeleteModal,
  closeDeleteModal,
  handleDeleteConfirm,
  showReportModal,
  setShowReportModal,
  showDetailsModal,
  onDownload,
}: VideoCardModalsProps) {
  return (
    <>
      <ContentActionModal
        isVisible={isModalVisible || modalVisible === modalKey}
        onClose={() => {
          closeModal();
          if (onModalToggle) onModalToggle(null);
        }}
        onViewDetails={() => {
          closeModal();
          setShowDetailsModal(true);
        }}
        onSaveToLibrary={() => onSave(modalKey, video)}
        onDownload={() => onDownload(video)}
        isSaved={!!contentStats[contentId]?.userInteractions?.saved}
        isDownloaded={checkIfDownloaded(video._id || video.fileUrl)}
        contentTitle={video.title}
        mediaId={video._id}
        uploadedBy={getUploadedBy(video)}
        mediaItem={video}
        onDelete={handleDeletePress}
        showDelete={userIsAdmin || isOwner}
        onReport={() => setShowReportModal(true)}
      />
      <DeleteMediaConfirmation
        visible={showDeleteModal}
        mediaId={video._id || ""}
        mediaTitle={video.title || "this media"}
        onClose={closeDeleteModal}
        onSuccess={handleDeleteConfirm}
        isAdmin={false}
      />
      <ReportMediaModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        mediaId={video._id || ""}
        mediaTitle={video.title}
      />
      <MediaDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        mediaItem={video}
      />
    </>
  );
}
