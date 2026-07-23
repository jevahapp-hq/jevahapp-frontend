import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";

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

function resolvePosterUri(video: VideoCardProps["video"]): string | null {
  const raw =
    (video as any).thumbnailUrl ??
    (video as any).coverImageUrl ??
    (video as any).imageUrl ??
    null;
  if (!raw) return null;
  if (typeof raw === "string") return isValidUri(raw) ? raw : null;
  if (typeof raw === "object" && typeof raw.uri === "string") {
    return isValidUri(raw.uri) ? raw.uri : null;
  }
  return null;
}

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
}) => {
  const contentId = video._id || getContentKey(video);
  const key = getContentKey(video);
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
  const posterUri = useMemo(() => resolvePosterUri(video), [video]);
  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../app/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch { }
  }, []);

  return (
    <View
      key={modalKey}
      className="flex flex-col mb-16"
      style={{ marginBottom: 64 }}
      onLayout={
        onLayout
          ? (event) => onLayout(event, key, "video", video.fileUrl)
          : undefined
      }
    >
      {shouldRenderPlayer ? (
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
        />
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onVideoTap(key, video, index)}
          className="w-full h-[400px] overflow-hidden relative bg-black"
        >
          {posterUri ? (
            <Image
              source={{ uri: posterUri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : null}
        </TouchableOpacity>
      )}

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
