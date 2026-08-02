import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { useMediaDeletion } from "../../../shared/hooks";
import { useContentActionModal } from "../../../shared/hooks/useContentActionModal";
import { VideoCardProps } from "../../../shared/types";
import { isAudioSermon, isValidUri } from "../../../shared/utils";
import {
  getBestVideoUrl,
  getVideoUrlFromMedia
} from "../../../shared/utils/videoUrlManager";
import { VideoCardFooter } from "./VideoCard/VideoCardFooter";
import { VideoCardModals } from "./VideoCard/VideoCardModals";
import { VideoCardPlayerArea } from "./VideoCard/VideoCardPlayerArea";
import { useVideoCardInteractionStats } from "./VideoCard/hooks/useVideoCardInteractionStats";

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  index,
  modalKey,
  contentStats,
  userFavorites,
  globalFavoriteCounts,
  playingVideos,
  mutedVideos,
  progresses,
  videoVolume,
  currentlyVisibleVideo,
  onVideoTap,
  onTogglePlay,
  onToggleMute,
  onLike,
  onComment,
  onSave,
  onDownload,
  onShare,
  onDelete,
  onModalToggle,
  modalVisible,
  comments,
  checkIfDownloaded,
  getContentKey,
  getTimeAgo,
  getUserDisplayNameFromContent,
  getUserAvatarFromContent,
  onLayout,
  isAutoPlayEnabled = false,
  shouldRenderPlayer = false,
  isFeedActive = true,
  playbackKey,
  isHero = false,
  onSurfaceReadyChange,
}) => {
  const contentId = video._id || getContentKey(video);
  const key = playbackKey ?? getContentKey(video);
  const isMuted = mutedVideos[key] ?? false; // Ensure boolean, never undefined

  // ✅ Use centralized utility for media type detection
  const isAudioSermonValue = isAudioSermon(video);

  const rawVideoUrl = !isAudioSermonValue ? getVideoUrlFromMedia(video) : null;
  const videoUrl = rawVideoUrl && isValidUri(rawVideoUrl)
    ? getBestVideoUrl(rawVideoUrl)
    : null;

  // Debug newly uploaded videos
  useEffect(() => {
    if (__DEV__ && video.title.includes('61 (HD)')) {
      console.log(`🔍 [VideoCard] Tracking problematic upload: "${video.title}"`);
      console.log(`   - rawVideoUrl: ${rawVideoUrl}`);
      console.log(`   - videoUrl: ${videoUrl}`);
      console.log(`   - shouldRenderPlayer: ${shouldRenderPlayer}`);
    }
  }, [video, videoUrl, shouldRenderPlayer]);

  const [showReportModal, setShowReportModal] = useState(false);
  const { isModalVisible, openModal, closeModal } = useContentActionModal();
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const storeRef = useRef<any>(null);

  // Delete media functionality - using reusable hook
  const {
    isOwner,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteConfirm: handleDeleteConfirmInternal,
  } = useMediaDeletion({
    mediaItem: video,
    isModalVisible: isModalVisible || modalVisible === modalKey,
    onDeleteSuccess: (deletedVideo) => {
      closeModal();
      if (onDelete) {
        onDelete(deletedVideo);
      }
    },
  });

  // Handle delete button press
  const handleDeletePress = useCallback(() => {
    openDeleteModal();
  }, [openDeleteModal]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    closeDeleteModal();
    closeModal();
    if (onDelete) {
      onDelete(video);
    }
  }, [video, closeDeleteModal, closeModal, onDelete]);

  const {
    likeCount,
    saveCount,
    commentCount,
    viewCount,
    userLikeState,
    userSaveState,
    isLoadingStats,
  } = useVideoCardInteractionStats({
    video,
    contentId,
    contentKey: key,
    contentStats,
    userFavorites,
    globalFavoriteCounts,
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../app/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch { }
  }, []);

  // Always reserve footer layout for video posts — popping it in after the
  // frame caused FlashList rows to stack/flash over each other.
  const isVideoPost = !isAudioSermonValue && !!videoUrl;
  const showFooterSlot = isAudioSermonValue || !videoUrl || isVideoPost;

  return (
    // No `key` here — FlashList v2 recycles this exact component instance
    // across items; a `key` prop forces React to tear down and remount the
    // whole card (new player, re-fetched thumbnail, reset state) on every
    // recycle instead of just diffing/updating props.
    <View
      className="flex flex-col"
      collapsable={false}
      style={{
        marginBottom: showFooterSlot ? 64 : 0,
        overflow: "hidden",
      }}
      onLayout={
        onLayout
          ? (event) => onLayout(event, key, "video", video.fileUrl)
          : undefined
      }
    >
      <VideoCardPlayerArea
        video={video}
        contentKey={key}
        index={index}
        isActive={true}
        videoUrl={videoUrl}
        videoVolume={videoVolume}
        isMuted={isMuted}
        onVideoTap={onVideoTap}
        onTogglePlay={onTogglePlay}
        onToggleMute={onToggleMute}
        getContentKey={getContentKey}
        onDelete={onDelete}
        onModalToggle={onModalToggle}
        modalVisible={modalVisible}
        checkIfDownloaded={checkIfDownloaded}
        getTimeAgo={getTimeAgo}
        getUserDisplayNameFromContent={getUserDisplayNameFromContent}
        getUserAvatarFromContent={getUserAvatarFromContent}
        onLayout={onLayout}
        onForceActive={() => { }}
        shouldRenderPlayer={shouldRenderPlayer}
        isFeedActive={isFeedActive}
        isViewportVisible={currentlyVisibleVideo === key}
        isHero={isHero}
        onSurfaceReadyChange={onSurfaceReadyChange}
      />

      {showFooterSlot && (
        <View collapsable={false}>
          <VideoCardFooter
            video={video}
            contentKey={key}
            modalKey={modalKey}
            contentId={contentId}
            getUserAvatarFromContent={getUserAvatarFromContent}
            getUserDisplayNameFromContent={getUserDisplayNameFromContent}
            getTimeAgo={getTimeAgo}
            viewCount={viewCount}
            userLikeState={userLikeState}
            likeCount={likeCount}
            likeBurstKey={likeBurstKey}
            setLikeBurstKey={setLikeBurstKey}
            onLike={onLike}
            onComment={onComment}
            commentCount={commentCount}
            userSaveState={userSaveState}
            saveCount={saveCount}
            onSave={onSave}
            onShare={onShare}
            isLoadingStats={isLoadingStats}
            openModal={openModal}
            onModalToggle={onModalToggle}
          />
        </View>
      )}

      <VideoCardModals
        isModalVisible={isModalVisible}
        modalVisible={modalVisible}
        modalKey={modalKey}
        onModalToggle={onModalToggle}
        closeModal={closeModal}
        setShowDetailsModal={setShowDetailsModal}
        onSave={onSave}
        video={video}
        contentStats={contentStats}
        contentId={contentId}
        checkIfDownloaded={checkIfDownloaded as any}
        handleDeletePress={handleDeletePress}
        userIsAdmin={false}
        isOwner={isOwner}
        showDeleteModal={showDeleteModal}
        closeDeleteModal={closeDeleteModal}
        handleDeleteConfirm={handleDeleteConfirm}
        showReportModal={showReportModal}
        setShowReportModal={setShowReportModal}
        showDetailsModal={showDetailsModal}
        onDownload={onDownload}
      />
    </View>
  );
};

export default memo(VideoCard);
