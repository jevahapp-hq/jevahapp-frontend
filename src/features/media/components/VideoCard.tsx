import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Image, TouchableOpacity, View } from "react-native";

import { VideoCardProps } from "../../../shared/types";
import { isAudioSermon, isValidUri } from "../../../shared/utils";
import {
  getBestVideoUrl,
  getVideoUrlFromMedia,
} from "../../../shared/utils/videoUrlManager";
import {
  MediaCardFooter,
  MediaCardModals,
  MediaCardShell,
  useMediaCardChrome,
} from "./MediaCard";
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
  mutedVideos,
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
  checkIfDownloaded,
  getContentKey,
  getTimeAgo,
  getUserDisplayNameFromContent,
  getUserAvatarFromContent,
  onLayout,
  shouldRenderPlayer = false,
  focusRef,
}) => {
  const contentId = video._id || getContentKey(video);
  const key = getContentKey(video);
  const isMuted = mutedVideos[key] ?? false;
  const isAudioSermonValue = isAudioSermon(video);
  const isFocused = currentlyVisibleVideo === key;

  const rawVideoUrl = !isAudioSermonValue ? getVideoUrlFromMedia(video) : null;
  const videoUrl =
    rawVideoUrl && isValidUri(rawVideoUrl)
      ? getBestVideoUrl(rawVideoUrl)
      : null;

  const chrome = useMediaCardChrome({
    item: video,
    parentModalOpen: modalVisible === modalKey,
    onDelete,
    checkAdmin: false,
  });

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

  const posterUri = useMemo(() => resolvePosterUri(video), [video]);
  const playerAnchorRef = useRef<View>(null);

  const openComments = useCallback(() => {
    const node = playerAnchorRef.current;
    if (node && typeof (node as any).measureInWindow === "function") {
      (node as any).measureInWindow(
        (_x: number, y: number, _w: number, h: number) => {
          const mediaBottomY =
            Number.isFinite(y) && Number.isFinite(h) && h > 0 ? y + h : undefined;
          onComment(
            key,
            video,
            mediaBottomY != null
              ? { mediaBottomY, mediaHeight: h }
              : null
          );
        }
      );
      return;
    }
    onComment(key, video, null);
  }, [key, onComment, video]);

  useEffect(() => {
    if (!__DEV__ || !shouldRenderPlayer || index > 2) return;
    console.log("[feed-card]", {
      id: contentId,
      duration: (video as any).duration,
      processingStatus: (video as any).processingStatus,
      fileUrl: typeof (video as any).fileUrl === "string"
        ? (video as any).fileUrl.slice(0, 80)
        : (video as any).fileUrl,
      hlsUrl: typeof (video as any).hlsUrl === "string"
        ? (video as any).hlsUrl.slice(0, 80)
        : (video as any).hlsUrl,
    });
  }, [contentId, video, shouldRenderPlayer, index]);

  return (
    <MediaCardShell
      focusRef={focusRef}
      onLayout={
        onLayout
          ? (event) => onLayout(event, key, "video", video.fileUrl)
          : undefined
      }
    >
      {shouldRenderPlayer ? (
        <View ref={playerAnchorRef} collapsable={false}>
          <VideoCardPlayerArea
            video={video}
            contentKey={key}
            index={index}
            isActive={isFocused}
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
            onForceActive={() => {}}
          />
        </View>
      ) : (
        <View ref={playerAnchorRef} collapsable={false}>
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
        </View>
      )}

      <MediaCardFooter
        item={video}
        contentId={contentId}
        viewCount={viewCount}
        userLikeState={userLikeState}
        likeCount={likeCount}
        likeBurstKey={chrome.likeBurstKey}
        setLikeBurstKey={chrome.setLikeBurstKey}
        onLike={() => onLike(key, video)}
        onComment={openComments}
        commentCount={commentCount}
        userSaveState={userSaveState}
        saveCount={saveCount}
        onSave={() => onSave(modalKey, video)}
        onShare={() => onShare(modalKey, video)}
        isLoadingStats={isLoadingStats}
        openModal={() => {
          chrome.openModal();
          onModalToggle?.(modalKey);
        }}
        getUserAvatarFromContent={getUserAvatarFromContent}
        getUserDisplayNameFromContent={getUserDisplayNameFromContent}
        getTimeAgo={getTimeAgo}
      />

      <MediaCardModals
        item={video}
        isModalVisible={
          chrome.isModalVisible || modalVisible === modalKey
        }
        closeModal={chrome.closeModal}
        setShowDetailsModal={chrome.setShowDetailsModal}
        onSave={() => onSave(modalKey, video)}
        onDownload={() => onDownload(video)}
        isSaved={!!contentStats[contentId]?.userInteractions?.saved}
        isDownloaded={checkIfDownloaded(video._id || video.fileUrl)}
        handleDeletePress={chrome.handleDeletePress}
        showDelete={chrome.isOwner}
        showDeleteModal={chrome.showDeleteModal}
        closeDeleteModal={chrome.closeDeleteModal}
        handleDeleteConfirm={chrome.handleDeleteConfirm}
        showReportModal={chrome.showReportModal}
        setShowReportModal={chrome.setShowReportModal}
        showDetailsModal={chrome.showDetailsModal}
        onParentModalClose={() => onModalToggle?.(null)}
      />
    </MediaCardShell>
  );
};

export default memo(VideoCard);
