/**
 * ContentItemRenderer - Renders VideoCard, MusicCard, or EbookCard by contentType
 * Memoized to prevent VirtualizedList "large list slow to update" - only re-renders
 * when this item's data changes, not when other items or global state changes.
 */
import React from "react";
import type { MediaItem } from "../../../../shared/types";
import EbookCard from "../../components/EbookCard";
import MusicCard from "../../components/MusicCard";
import VideoCard from "../../components/VideoCard";
import { getFeedContentKind } from "../utils/feedContentKind";
import { ContentUnavailableState } from "./ContentFeedStates";

export interface ContentItemRendererProps {
  item: MediaItem;
  index: number;
  getContentKey: (item: MediaItem) => string;
  getPlaybackKey: (item: MediaItem) => string;
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
  isFeedActive?: boolean;
  /**
   * Exact FlashList row key (e.g. Most Recent). Must match
   * `currentlyVisibleVideo` / playMedia keys from the feed orchestrator.
   */
  feedRowKey?: string;
  /** Most Recent hero — priority decode, no priming play overlay. */
  isHero?: boolean;
  onSurfaceReadyChange?: (ready: boolean) => void;
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
    isFeedActive,
    feedRowKey,
    isHero,
    onSurfaceReadyChange,
  } = props;

  const key = getKey(item);
  // Prefer the feed row key so Most Recent visibility/play matches the
  // orchestrator (row.key), not a stripped content-only key.
  const playbackKey = feedRowKey || getPlaybackKey(item);
  const contentId = item._id || key;
  const modalKey = key;

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
    playbackKey,
    isFeedActive,
    isHero,
    onSurfaceReadyChange,
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

  // Single classification pass drives BOTH which card renders here and,
  // via the same `getFeedContentKind`, how the feed mounts/recycles/warms
  // this row in index.tsx — the "smart content manager" that keeps video
  // preload/decoder logic from ever running against an ebook or audio row.
  if (item.moderationStatus === "rejected") {
    const isOwner =
      currentUserId &&
      (item.userId === currentUserId ||
        (typeof item.uploadedBy === "object" &&
          item.uploadedBy?._id === currentUserId) ||
        item.uploadedBy === currentUserId);
    if (!isOwner) return <ContentUnavailableState />;
  }

  // No `key` prop on any branch below — this is FlashList v2's recycled
  // cell output, not a `.map()` child. A `key` here made React fully
  // unmount/remount the whole card (new decoder, re-fetched thumbnail,
  // reset scroll/tap state) every time a cell got recycled to a different
  // item, instead of letting FlashList efficiently update props on the
  // reused view — the main cause of visible flicker/re-init while
  // scrolling fast.
  switch (getFeedContentKind(item)) {
    case "video":
      return <VideoCard {...videoCardProps} />;
    case "audio":
      return <MusicCard {...musicCardProps} />;
    case "ebook":
      return <EbookCard {...ebookCardProps} />;
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

  const prevPlaybackKey = prev.feedRowKey || prev.getPlaybackKey(prev.item);
  const nextPlaybackKey = next.feedRowKey || next.getPlaybackKey(next.item);

  return (
    prev.getUserLikeState(prevContentId) === next.getUserLikeState(nextContentId) &&
    prev.getLikeCount(prevContentId) === next.getLikeCount(nextContentId) &&
    prev.playingVideos[prevPlaybackKey] === next.playingVideos[nextPlaybackKey] &&
    prev.mutedVideos[prevPlaybackKey] === next.mutedVideos[nextPlaybackKey] &&
    prev.progresses[prevPlaybackKey] === next.progresses[nextPlaybackKey] &&
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
    prev.isAutoPlayEnabled === next.isAutoPlayEnabled &&
    prev.feedRowKey === next.feedRowKey &&
    !!prev.isHero === !!next.isHero
  );
}

export const ContentItemRenderer = React.memo(ContentItemRendererInner, arePropsEqual);
