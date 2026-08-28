/**
 * ContentItemRenderer - Renders VideoCard, MusicCard, or EbookCard by contentType
 * Memoized to prevent VirtualizedList "large list slow to update" - only re-renders
 * when this item's data changes, not when other items or global state changes.
 */
import React from "react";
import { canViewerSeeMedia } from "../../../../shared/media/moderationVisibility";
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
  getPlaybackKey: (item: MediaItem) => string;
  getUserLikeState: (contentId: string) => boolean;
  getLikeCount: (contentId: string) => number;
  contentStats: Record<string, any>;
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
  isFeedActive?: boolean;
}

function ContentItemRendererInner(props: ContentItemRendererProps) {
  const {
    item,
    index,
    getContentKey: getKey,
    getPlaybackKey,
    getUserLikeState,
    getLikeCount,
    contentStats,
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
    isFeedActive,
  } = props;

  const key = getKey(item);
  const playbackKey = getPlaybackKey(item);
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
    playbackKey,
    isFeedActive,
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

  /**
   * Backstop for the feed-level filter in `AllContentTikTok/index.tsx`, which
   * is the primary gate. Kept because this renderer is reachable from other
   * lists, and collapsed into the shared predicate — the four hand-rolled
   * copies that used to live here only checked `rejected`, and their owner test
   * was stricter than `extractUploaderId`, so an owner whose id couldn't be
   * resolved from props lost sight of their own upload.
   */
  if (!canViewerSeeMedia(item as any, currentUserId)) {
    return <ContentUnavailableState />;
  }

  switch (item.contentType) {
    case "video":
    case "videos":
      return <VideoCard key={key} {...videoCardProps} />;

    case "sermon":
    case "teachings":
      if (isAudioSermonValue) return <MusicCard key={key} {...musicCardProps} />;
      return <VideoCard key={key} {...videoCardProps} />;

    case "audio":
    case "music":
      return <MusicCard key={key} {...musicCardProps} />;

    case "image":
    case "ebook":
    case "e-books":
    case "ebooks":
    case "books":
    default:
      return <EbookCard key={key} {...ebookCardProps} />;
  }
}

/** Compare only item identity and item-specific state to avoid unnecessary re-renders */
function arePropsEqual(prev: ContentItemRendererProps, next: ContentItemRendererProps): boolean {
  if (prev.item._id !== next.item._id || prev.index !== next.index) return false;

  const prevKey = prev.getContentKey(prev.item);
  const nextKey = next.getContentKey(next.item);
  if (prevKey !== nextKey) return false;

  const prevContentId = prev.item._id || prevKey;
  const nextContentId = next.item._id || nextKey;
  const prevMusicId = `music-${prev.item._id || prev.index}`;
  const nextMusicId = `music-${next.item._id || next.index}`;

  const prevPlaybackKey = prev.getPlaybackKey(prev.item);
  const nextPlaybackKey = next.getPlaybackKey(next.item);

  return (
    prev.getUserLikeState(prevContentId) === next.getUserLikeState(nextContentId) &&
    prev.getLikeCount(prevContentId) === next.getLikeCount(nextContentId) &&
    (prev.currentlyVisibleVideo === prevPlaybackKey) ===
      (next.currentlyVisibleVideo === nextPlaybackKey) &&
    (prev.playingAudioId === prevMusicId) === (next.playingAudioId === nextMusicId) &&
    (prev.audioProgressMap[prevMusicId] ?? 0) === (next.audioProgressMap[nextMusicId] ?? 0) &&
    (prev.modalVisible === prevKey) === (next.modalVisible === nextKey) &&
    prev.currentUserId === next.currentUserId &&
    // Without this, FlashList never remounts <Video> when the preload window
    // adds this key — autoplay has nothing to drive shouldPlay on.
    !!prev.shouldRenderPlayer === !!next.shouldRenderPlayer &&
    prev.isFeedActive === next.isFeedActive &&
    prev.isAutoPlayEnabled === next.isAutoPlayEnabled
  );
}

export const ContentItemRenderer = React.memo(ContentItemRendererInner, arePropsEqual);
