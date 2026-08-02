/**
 * MusicCard — thin composition shell (media slot + shared chrome).
 */
import React, { memo, useCallback, useRef } from "react";
import { View } from "react-native";
import { useCommentModal } from "../../../../../app/context/CommentModalContext";
import { MusicCardProps } from "../../../../shared/types";
import {
  MediaCardFooter,
  MediaCardModals,
  MediaCardShell,
  useMediaCardChrome,
  useMediaCardStoreStats,
} from "../MediaCard";
import { MusicCardPlayerArea } from "./MusicCardPlayerArea";
import { useMusicCardPlayback } from "./hooks/useMusicCardPlayback";
import { useMusicViewTracking } from "./hooks/useMusicViewTracking";

export const MusicCard: React.FC<MusicCardProps> = ({
  audio,
  index,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
  onDelete,
  onPlay,
  onLayout,
  focusRef,
}) => {
  const { showCommentModal } = useCommentModal();
  const contentId = audio._id || `music-${index}`;
  const isSermon = audio.contentType === "sermon";
  const playerAnchorRef = useRef<View>(null);

  const chrome = useMediaCardChrome({
    item: audio,
    onDelete,
    checkAdmin: true,
  });

  const stats = useMediaCardStoreStats(
    contentId,
    audio,
    audio.contentType || "media"
  );

  const playback = useMusicCardPlayback(audio, index);

  useMusicViewTracking({
    contentId: String(audio._id || ""),
    contentType: audio.contentType || "media",
    isPlaying: playback.playerState.isPlaying,
    positionMs: playback.playerState.position || 0,
    progress: playback.playerState.progress || 0,
    durationMs: playback.playerState.duration || 0,
  });

  const thumbnailSource = audio?.imageUrl || audio?.thumbnailUrl;
  const thumbnailUri =
    typeof thumbnailSource === "string"
      ? thumbnailSource
      : (thumbnailSource as any)?.uri;

  const handleMute = useCallback(() => {
    if (playback.isVirtualTrack && playback.isCurrentTrack) {
      playback.globalAudioStore.toggleMute();
    } else {
      playback.controls.toggleMute();
    }
  }, [playback]);

  const openComments = useCallback(() => {
    const finish = (anchor: { mediaBottomY: number; mediaHeight?: number } | null) => {
      if (onComment) onComment(audio, anchor);
      else showCommentModal([], String(contentId), "media", undefined, null, anchor);
    };

    const node = playerAnchorRef.current;
    if (node && typeof (node as any).measureInWindow === "function") {
      (node as any).measureInWindow(
        (_x: number, y: number, _w: number, h: number) => {
          const mediaBottomY =
            Number.isFinite(y) && Number.isFinite(h) && h > 0 ? y + h : undefined;
          finish(
            mediaBottomY != null
              ? { mediaBottomY, mediaHeight: h }
              : null
          );
        }
      );
      return;
    }
    finish(null);
  }, [audio, contentId, onComment, showCommentModal]);

  return (
    <MediaCardShell
      focusRef={focusRef}
      onLayout={
        onLayout
          ? (event) =>
              onLayout(
                event,
                `music-${audio._id || index}`,
                "music",
                audio.fileUrl
              )
          : undefined
      }
    >
      <View ref={playerAnchorRef} collapsable={false}>
        <MusicCardPlayerArea
          audio={audio}
          thumbnailUri={thumbnailUri}
          isSermon={isSermon}
          attemptedPlay={playback.attemptedPlay}
          hasDuration={!!playback.playerState.duration}
          progress={
            playback.isVirtualTrack
              ? playback.globalAudioStore.progress || 0
              : playback.playerState.progress || 0
          }
          isMuted={
            playback.isVirtualTrack
              ? playback.globalAudioStore.isMuted || false
              : playback.playerState.isMuted || false
          }
          isPlaying={playback.isPlayingFromGlobal}
          onToggleOverlay={() => playback.setShowOverlay((v) => !v)}
          onToggleMute={handleMute}
          onSeekRelative={playback.seekBySeconds}
          onSeekToPercent={playback.onSeekToPercent}
          onPlayPress={() => void playback.handlePlayPress(onPlay)}
        />
      </View>

      <MediaCardFooter
        item={audio}
        contentId={contentId}
        viewCount={stats.viewCount}
        userLikeState={stats.userLikeState}
        likeCount={stats.likeCount}
        likeBurstKey={chrome.likeBurstKey}
        setLikeBurstKey={chrome.setLikeBurstKey}
        onLike={() => onLike(audio)}
        onComment={openComments}
        commentCount={stats.commentCount}
        userSaveState={stats.userSaveState}
        saveCount={stats.saveCount}
        onSave={() => onSave(audio)}
        onShare={() => onShare(audio)}
        isLoadingStats={stats.isLoadingStats}
        openModal={chrome.openModal}
        showModerationBadge
      />

      <MediaCardModals
        item={audio}
        isModalVisible={chrome.isModalVisible}
        closeModal={chrome.closeModal}
        setShowDetailsModal={chrome.setShowDetailsModal}
        onSave={() => onSave(audio)}
        onDownload={() => onDownload(audio)}
        isSaved={!!audio.saves || stats.userSaveState}
        isDownloaded={false}
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

export default memo(MusicCard);
