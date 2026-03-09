/**
 * ContentItemRenderer - Renders VideoCard, MusicCard, or EbookCard by contentType
 * Memoized to prevent VirtualizedList "large list slow to update" - only re-renders
 * when this item's data changes, not when other items or global state changes.
 */
import React from "react";
import type { MediaItem } from "../../../../shared/types";
import { isAudioSermon } from "../../../../shared/utils";
import EbookCard from "../../components/EbookCard";
import MusicCard from "../../components/MusicCard";
import VideoCard from "../../components/VideoCard";
import { ContentUnavailableState } from "./ContentFeedStates";

export interface ContentItemRendererProps {
  item: MediaItem;
  index: number;
  getContentKey: (item: MediaItem) => string;
  getUserLikeState: (contentId: string) => boolean;
  getLikeCount: (contentId: string) => number;
  contentStats: Record<string, any>;
  playingVideos: Record<string, boolean>;
  mutedVideos: Record<string, boolean>;
  progresses: Record<string, number>;
  videoVolume: number;
  currentlyVisibleVideo: string | null;
  playingAudioId: string | null;
  audioProgressMap: Record<string, number>;
  modalVisible: string | null;
  comments: any;
  onVideoTap: (key: string, video: MediaItem, index: number) => void;
  onTogglePlay: (key: string) => void;
  onToggleMute: (key: string) => void;
  onLike: (key: string, item: MediaItem) => void;
  onComment: (key: string, item: MediaItem) => void;
  onSave: (key: string, item: MediaItem) => void;
  onShare: (key: string, item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
  onModalToggle: (val: string | null) => void;
  onLayout: (event: any, key: string, type: "video" | "music", uri?: string) => void;
  onPause: () => void;
  onDelete: () => void;
  playAudio: (uri: string, id: string) => void;
  pauseAllAudio: () => void;
  checkIfDownloaded: (item: any) => boolean;
  getTimeAgo: (date: string) => string;
  getUserDisplayNameFromContent: (item: MediaItem) => string;
  getUserAvatarFromContent: (item: MediaItem) => string | undefined;
  isAutoPlayEnabled: boolean;
  currentUserId: string | null;
  shouldRenderPlayer?: boolean;
}

function ContentItemRendererInner(props: ContentItemRendererProps) {
  const {
    item,
    index,
    getContentKey: getKey,
    getUserLikeState,
    getLikeCount,
    contentStats,
    playingVideos,
    mutedVideos,
    progresses,
    videoVolume,
    currentlyVisibleVideo,
    playingAudioId,
    audioProgressMap,
    modalVisible,
    comments,
    onVideoTap,
    onTogglePlay,
    onToggleMute,
    onLike,
    onComment,
    onSave,
    onShare,
    onDownload,
    onModalToggle,
    onLayout,
    onPause,
    onDelete,
    playAudio,
    pauseAllAudio,
    checkIfDownloaded,
    getTimeAgo,
    getUserDisplayNameFromContent,
    getUserAvatarFromContent,
    isAutoPlayEnabled,
    currentUserId,
    shouldRenderPlayer,
  } = props;

  const key = getKey(item);
  const contentId = item._id || key;
  const modalKey = key;
  const isAudioSermonValue = isAudioSermon(item);

  const backendUserFavorites = { [key]: getUserLikeState(contentId) };
  const backendGlobalFavoriteCounts = { [key]: getLikeCount(contentId) };
  const musicId = `music-${item._id || index}`;

  const videoCardProps = {
    video: item,
    index,
    modalKey,
    contentStats,
    userFavorites: backendUserFavorites,
    globalFavoriteCounts: backendGlobalFavoriteCounts,
    playingVideos,
    mutedVideos,
    progresses,
    videoVolume,
    currentlyVisibleVideo,
    onVideoTap,
    onTogglePlay,
    onToggleMute: onToggleMute,
    onLike: () => onLike(key, item),
    onComment: () => onComment(key, item),
    onSave: () => onSave(key, item),
    onDownload: () => onDownload(item),
    onShare: () => onShare(key, item),
    onModalToggle,
    modalVisible,
    comments,
    checkIfDownloaded,
    getContentKey: getKey,
    getTimeAgo,
    getUserDisplayNameFromContent,
    getUserAvatarFromContent,
    onLayout,
    isAutoPlayEnabled,
    onDelete,
    shouldRenderPlayer: props.shouldRenderPlayer,
  };

  const musicCardProps = {
    audio: item,
    index,
    onLike: () => onLike(key, item),
    onComment: () => onComment(key, item),
    onSave: () => onSave(key, item),
    onShare: () => onShare(key, item),
    onDownload: () => onDownload(item),
    onPlay: playAudio,
    isPlaying: playingAudioId === musicId,
    progress: audioProgressMap[musicId] || 0,
    onLayout,
    onPause: pauseAllAudio,
    onDelete,
  };

  const ebookCardProps = {
    ebook: item,
    index,
    onLike: () => onLike(key, item),
    onComment: () => onComment(key, item),
    onSave: () => onSave(key, item),
    onShare: () => onShare(key, item),
    onDownload: () => onDownload(item),
    checkIfDownloaded,
    onDelete,
  };

  switch (item.contentType) {
    case "video":
    case "videos":
      if (item.moderationStatus === 'rejected') {
        const isOwner = currentUserId && (
          (item.userId === currentUserId) ||
          (typeof item.uploadedBy === 'object' && item.uploadedBy?._id === currentUserId) ||
          (item.uploadedBy === currentUserId)
        );
        if (!isOwner) return <ContentUnavailableState />;
      }
      return <VideoCard key={key} {...videoCardProps} />;

    case "sermon":
      if (item.moderationStatus === 'rejected') {
        const isOwner = currentUserId && (
          (item.userId === currentUserId) ||
          (typeof item.uploadedBy === 'object' && item.uploadedBy?._id === currentUserId) ||
          (item.uploadedBy === currentUserId)
        );
        if (!isOwner) return <ContentUnavailableState />;
      }
      if (isAudioSermonValue) return <MusicCard key={key} {...musicCardProps} />;
      return <VideoCard key={key} {...videoCardProps} />;

    case "audio":
    case "music":
      if (item.moderationStatus === 'rejected') {
        const isOwner = currentUserId && (
          (item.userId === currentUserId) ||
          (typeof item.uploadedBy === 'object' && item.uploadedBy?._id === currentUserId) ||
          (item.uploadedBy === currentUserId)
        );
        if (!isOwner) return <ContentUnavailableState />;
      }
      return <MusicCard key={key} {...musicCardProps} />;

    case "image":
    case "ebook":
    case "books":
    default:
      if (item.moderationStatus === 'rejected') {
        const isOwner = currentUserId && (
          (item.userId === currentUserId) ||
          (typeof item.uploadedBy === 'object' && item.uploadedBy?._id === currentUserId) ||
          (item.uploadedBy === currentUserId)
        );
        if (!isOwner) return <ContentUnavailableState />;
      }
      return <EbookCard key={key} {...ebookCardProps} />;
  }
}

/** Compare only item identity and item-specific state to avoid unnecessary re-renders */
function arePropsEqual(prev: ContentItemRendererProps, next: ContentItemRendererProps): boolean {
  const prevKey = prev.getContentKey(prev.item);
  const nextKey = next.getContentKey(next.item);
  if (prev.item._id !== next.item._id || prev.index !== next.index) return false;

  const prevContentId = prev.item._id || prevKey;
  const nextContentId = next.item._id || nextKey;
  const musicId = `music-${next.item._id || next.index}`;

  return (
    prev.getUserLikeState(prevContentId) === next.getUserLikeState(nextContentId) &&
    prev.getLikeCount(prevContentId) === next.getLikeCount(nextContentId) &&
    prev.playingVideos[prevKey] === next.playingVideos[nextKey] &&
    prev.mutedVideos[prevKey] === next.mutedVideos[nextKey] &&
    prev.progresses[prevKey] === next.progresses[nextKey] &&
    (prev.currentlyVisibleVideo === prevKey) === (next.currentlyVisibleVideo === nextKey) &&
    (prev.playingAudioId === `music-${prev.item._id || prev.index}`) ===
    (next.playingAudioId === musicId) &&
    (prev.audioProgressMap[`music-${prev.item._id || prev.index}`] ?? 0) ===
    (next.audioProgressMap[musicId] ?? 0) &&
    (prev.modalVisible === prevKey) === (next.modalVisible === nextKey) &&
    prev.currentUserId === next.currentUserId
  );
}

export const ContentItemRenderer = React.memo(ContentItemRendererInner, arePropsEqual);
