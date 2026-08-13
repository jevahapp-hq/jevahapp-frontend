/**
 * ContentItemRenderer - Renders VideoCard, MusicCard, or EbookCard by contentType
 * Memoized to prevent VirtualizedList "large list slow to update" - only re-renders
 * when this item's data changes, not when other items or global state changes.
 */
import React, { useMemo } from "react";
import {
  useContentStats,
} from "../../../../../app/store/useInteractionStore";
import type { MediaItem } from "../../../../shared/types";
import { detectMediaType, isAudioSermon } from "../../../../shared/utils";
import EbookCard from "../../components/EbookCard";
import MusicCard from "../../components/MusicCard";
import VideoCard from "../../components/VideoCard";
import { ContentUnavailableState } from "./ContentFeedStates";

/** Progress is owned by the player overlay — avoid feed-wide progress map churn */
const EMPTY_PROGRESSES: Record<string, number> = {};

export interface ContentItemRendererProps {
  item: MediaItem;
  index: number;
  getContentKey: (item: MediaItem) => string;
  playingVideos: Record<string, boolean>;
  mutedVideos: Record<string, boolean>;
  videoVolume: number;
  currentlyVisibleVideo: string | null;
  playingAudioId: string | null;
  audioProgressMap: Record<string, number>;
  modalVisible: string | null;
  onVideoTap: (key: string, video: MediaItem, index: number) => void;
  onTogglePlay: (key: string) => void;
  onToggleMute: (key: string) => void;
  onLike: (key: string, item: MediaItem) => void;
  onComment: (
    key: string,
    item: MediaItem,
    anchor?: { mediaBottomY: number; mediaHeight?: number } | null
  ) => void;
  onSave: (key: string, item: MediaItem) => void;
  onShare: (key: string, item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
  onModalToggle: (val: string | null) => void;
  onLayout?: (event: any, key: string, type: "video" | "music", uri?: string) => void;
  onPause: () => void;
  onDelete: (item?: MediaItem) => void;
  playAudio: (uri: string, id: string) => void;
  pauseAllAudio: () => void;
  checkIfDownloaded: (item: any) => boolean;
  getTimeAgo: (date: string) => string;
  getUserDisplayNameFromContent: (item: MediaItem) => string;
  getUserAvatarFromContent: (item: MediaItem) => string | undefined;
  isAutoPlayEnabled: boolean;
  currentUserId: string | null;
  shouldRenderPlayer?: boolean;
  focusRef?: (node: any) => void;
}

function ContentItemRendererInner(props: ContentItemRendererProps) {
  const {
    item,
    index,
    getContentKey: getKey,
    playingVideos,
    mutedVideos,
    videoVolume,
    currentlyVisibleVideo,
    playingAudioId,
    audioProgressMap,
    modalVisible,
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
    focusRef,
  } = props;

  const key = getKey(item);
  const contentId = item._id || key;
  const itemStats = useContentStats(contentId);
  const contentStats = useMemo(
    () => (itemStats ? { [contentId]: itemStats } : {}),
    [contentId, itemStats]
  );

  const modalKey = key;
  const isAudioSermonValue = isAudioSermon(item);
  // File MIME/URL win over a wrong stored contentType (e.g. video titled "Book…")
  const mediaKind = detectMediaType(item);
  const storedType = String(item.contentType || "").toLowerCase().trim();
  const isSermon =
    storedType === "sermon" || storedType === "devotional";

  const rejectGate = () => {
    if (item.moderationStatus !== "rejected") return null;
    const isOwner =
      currentUserId &&
      (item.userId === currentUserId ||
        (typeof item.uploadedBy === "object" &&
          item.uploadedBy?._id === currentUserId) ||
        item.uploadedBy === currentUserId);
    if (!isOwner) return <ContentUnavailableState />;
    return null;
  };

  const liked = !!itemStats?.userInteractions?.liked;
  const likeCount = itemStats?.likes || 0;
  const backendUserFavorites = { [key]: liked };
  const backendGlobalFavoriteCounts = { [key]: likeCount };
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
    progresses: EMPTY_PROGRESSES,
    videoVolume,
    currentlyVisibleVideo,
    onVideoTap,
    onTogglePlay,
    onToggleMute: onToggleMute,
    onLike: () => onLike(key, item),
    onComment: (
      k: string,
      i: MediaItem,
      a?: { mediaBottomY: number; mediaHeight?: number } | null
    ) => onComment(k, i, a),
    onSave: () => onSave(key, item),
    onDownload: () => onDownload(item),
    onShare: () => onShare(key, item),
    onModalToggle,
    modalVisible,
    comments: undefined,
    checkIfDownloaded,
    getContentKey: getKey,
    getTimeAgo,
    getUserDisplayNameFromContent,
    getUserAvatarFromContent,
    onLayout,
    isAutoPlayEnabled,
    onDelete,
    shouldRenderPlayer: props.shouldRenderPlayer,
    focusRef: props.focusRef,
  };

  const musicCardProps = {
    audio: item,
    index,
    onLike: () => onLike(key, item),
    onComment: (
      item: MediaItem,
      a?: { mediaBottomY: number; mediaHeight?: number } | null
    ) => onComment(key, item, a),
    onSave: () => onSave(key, item),
    onShare: () => onShare(key, item),
    onDownload: () => onDownload(item),
    onPlay: playAudio,
    isPlaying: playingAudioId === musicId,
    progress: audioProgressMap[musicId] || 0,
    onLayout,
    onPause: pauseAllAudio,
    onDelete,
    focusRef: props.focusRef,
  };

  const ebookCardProps = {
    ebook: item,
    index,
    onLike: () => onLike(key, item),
    onComment: (
      item: MediaItem,
      a?: { mediaBottomY: number; mediaHeight?: number } | null
    ) => onComment(key, item, a),
    onSave: () => onSave(key, item),
    onShare: () => onShare(key, item),
    onDownload: () => onDownload(item),
    onDelete,
    checkIfDownloaded,
  };

  const rejected = rejectGate();
  if (rejected) return rejected;

  if (isSermon) {
    if (isAudioSermonValue) return <MusicCard key={key} {...musicCardProps} />;
    return <VideoCard key={key} {...videoCardProps} />;
  }

  if (mediaKind === "video") {
    return <VideoCard key={key} {...videoCardProps} />;
  }
  if (mediaKind === "gif") {
    return <VideoCard key={key} {...videoCardProps} />;
  }
  if (mediaKind === "audio") {
    return <MusicCard key={key} {...musicCardProps} />;
  }
  if (mediaKind === "ebook") {
    return <EbookCard key={key} {...ebookCardProps} />;
  }

  // Ambiguous file: use stored contentType tokens only (never title text)
  switch (storedType) {
    case "gif":
    case "gifs":
      return <VideoCard key={key} {...videoCardProps} />;
    case "audio":
    case "music":
    case "podcast":
    case "podcasts":
      return <MusicCard key={key} {...musicCardProps} />;
    case "image":
    case "ebook":
    case "e-books":
    case "books":
    case "book":
    case "pdf":
      return <EbookCard key={key} {...ebookCardProps} />;
    default:
      return <VideoCard key={key} {...videoCardProps} />;
  }
}

/** Compare only item identity and item-specific state to avoid unnecessary re-renders */
function arePropsEqual(prev: ContentItemRendererProps, next: ContentItemRendererProps): boolean {
  if (prev.item._id !== next.item._id || prev.index !== next.index) return false;

  const prevKey = prev.getContentKey(prev.item);
  const nextKey = next.getContentKey(next.item);
  if (prevKey !== nextKey) return false;

  const prevMusicId = `music-${prev.item._id || prev.index}`;
  const nextMusicId = `music-${next.item._id || next.index}`;

  return (
    // contentStats subscribed inside via useContentStats(contentId)
    prev.playingVideos[prevKey] === next.playingVideos[nextKey] &&
    prev.mutedVideos[prevKey] === next.mutedVideos[nextKey] &&
    (prev.currentlyVisibleVideo === prevKey) === (next.currentlyVisibleVideo === nextKey) &&
    (prev.shouldRenderPlayer ?? true) === (next.shouldRenderPlayer ?? true) &&
    (prev.playingAudioId === prevMusicId) === (next.playingAudioId === nextMusicId) &&
    (prev.audioProgressMap[prevMusicId] ?? 0) === (next.audioProgressMap[nextMusicId] ?? 0) &&
    (prev.modalVisible === prevKey) === (next.modalVisible === nextKey) &&
    prev.currentUserId === next.currentUserId &&
    prev.videoVolume === next.videoVolume &&
    prev.isAutoPlayEnabled === next.isAutoPlayEnabled
  );
}

export const ContentItemRenderer = React.memo(ContentItemRendererInner, arePropsEqual);
