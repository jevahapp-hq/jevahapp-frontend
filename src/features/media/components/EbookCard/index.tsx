/**
 * EbookCard — thin composition shell (cover + shared chrome).
 */
import React, { memo } from "react";
import { useCommentModal } from "../../../../../app/context/CommentModalContext";
import { EbookCardProps } from "../../../../shared/types";
import {
  MediaCardFooter,
  MediaCardModals,
  MediaCardShell,
  useMediaCardChrome,
  useMediaCardStoreStats,
} from "../MediaCard";
import { EbookCardCoverArea } from "./EbookCardCoverArea";
import { useEbookOpen } from "./hooks/useEbookOpen";
import { useEbookViewTracking } from "./hooks/useEbookViewTracking";

export const EbookCard: React.FC<EbookCardProps> = ({
  ebook,
  index,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
  onDelete,
  checkIfDownloaded,
}) => {
  const { showCommentModal } = useCommentModal();
  const contentId = ebook._id || `ebook-${index}`;

  const chrome = useMediaCardChrome({
    item: ebook,
    onDelete,
    checkAdmin: true,
  });

  const stats = useMediaCardStoreStats(contentId, ebook, "media");
  useEbookViewTracking(contentId);

  const openEbook = useEbookOpen(ebook, chrome.setShowDetailsModal);

  return (
    <MediaCardShell className="flex flex-col mb-10" style={{}}>
      <EbookCardCoverArea ebook={ebook} onPress={openEbook} />

      <MediaCardFooter
        item={ebook}
        contentId={contentId}
        viewCount={stats.viewCount}
        userLikeState={stats.userLikeState}
        likeCount={stats.likeCount}
        likeBurstKey={chrome.likeBurstKey}
        setLikeBurstKey={chrome.setLikeBurstKey}
        onLike={() => onLike(ebook)}
        onComment={() => {
          if (onComment) onComment(ebook);
          else showCommentModal([], String(contentId));
        }}
        commentCount={stats.commentCount}
        userSaveState={stats.userSaveState}
        saveCount={stats.saveCount}
        onSave={() => onSave(ebook)}
        onShare={() => onShare(ebook)}
        isLoadingStats={stats.isLoadingStats}
        openModal={chrome.openModal}
        likeColor="#FF1744"
        showModerationBadge
        footerClassName="flex-row items-center justify-between mt-1 px-2"
        menuStyle={{ marginRight: 8 }}
      />

      <MediaCardModals
        item={ebook}
        isModalVisible={chrome.isModalVisible}
        closeModal={chrome.closeModal}
        setShowDetailsModal={chrome.setShowDetailsModal}
        onSave={() => onSave(ebook)}
        onDownload={() => onDownload(ebook)}
        isSaved={!!(ebook as any)?.saved || stats.userSaveState}
        isDownloaded={checkIfDownloaded(ebook._id || ebook.fileUrl)}
        handleDeletePress={chrome.handleDeletePress}
        showDelete={chrome.userIsAdmin || chrome.isOwner}
        showDeleteModal={chrome.showDeleteModal}
        closeDeleteModal={chrome.closeDeleteModal}
        handleDeleteConfirm={chrome.handleDeleteConfirm}
        showReportModal={chrome.showReportModal}
        setShowReportModal={chrome.setShowReportModal}
        showDetailsModal={chrome.showDetailsModal}
      />
    </MediaCardShell>
  );
};

export default memo(EbookCard);
