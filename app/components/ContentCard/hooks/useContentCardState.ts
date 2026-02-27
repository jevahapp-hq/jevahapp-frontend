import React, { useMemo, useRef, useState } from "react";
import { Animated } from "react-native";
import { useSafeLibraryStore } from "../../../hooks/useSafeLibraryStore";
import { useLibraryStore } from "../../../store/useLibraryStore";
import type { ContentCardContent, MappedContent } from "../types";

export function useContentCardState(content: ContentCardContent) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [contentStats, setContentStats] = useState<Record<string, any>>({});

  const [isLiked, setIsLiked] = useState(content.isLiked || false);
  const [likeCount, setLikeCount] = useState(content.likeCount || (content as any).favoriteCount || 0);
  const [commentCount, setCommentCount] = useState(content.commentCount || 0);
  const [shareCount, setShareCount] = useState(content.shareCount || 0);
  const [viewerCount, setViewerCount] = useState((content as any).liveViewers || 0);

  const safeLibraryStore = useSafeLibraryStore();
  const directLibraryStore = useLibraryStore();

  const isItemInLibrary = useMemo(() => {
    try {
      let result = safeLibraryStore.isItemSaved(content._id);
      if (!result && directLibraryStore.isLoaded) result = directLibraryStore.isItemSaved(content._id);
      return result;
    } catch {
      return false;
    }
  }, [safeLibraryStore, directLibraryStore, content._id]);

  const [isBookmarked, setIsBookmarked] = useState(content.isBookmarked || isItemInLibrary || false);
  const [isLive, setIsLive] = useState(content.isLive || false);
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoOverlay, setShowVideoOverlay] = useState(true);

  const mappedContent: MappedContent = useMemo(
    () => ({
      ...content,
      mediaUrl: content.mediaUrl || (content as any).fileUrl,
      likeCount: content.likeCount || (content as any).favoriteCount || 0,
      commentCount: content.commentCount || 0,
      shareCount: content.shareCount || 0,
      viewCount: content.viewCount || 0,
      author:
        content.author ||
        content.authorInfo || {
          _id: (content as any).uploadedBy?._id || (content as any).uploadedBy || "unknown",
          firstName: (content as any).uploadedBy?.firstName || "Unknown",
          lastName: (content as any).uploadedBy?.lastName || "User",
          avatar: (content as any).uploadedBy?.avatar,
        },
    }),
    [content]
  );

  const likeAnimation = useRef(new Animated.Value(1)).current;
  const heartAnimation = useRef(new Animated.Value(0)).current;
  const commentAnimation = useRef(new Animated.Value(1)).current;
  const livePulseAnimation = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!directLibraryStore.isLoaded) directLibraryStore.loadSavedItems();
  }, [directLibraryStore]);

  React.useEffect(() => {
    setIsBookmarked(content.isBookmarked || isItemInLibrary || false);
  }, [isItemInLibrary, content.isBookmarked]);

  return {
    isPlaying,
    setIsPlaying,
    isVideoLoading,
    setIsVideoLoading,
    modalVisible,
    setModalVisible,
    viewCounted,
    setViewCounted,
    contentStats,
    setContentStats,
    isLiked,
    setIsLiked,
    likeCount,
    setLikeCount,
    commentCount,
    setCommentCount,
    shareCount,
    setShareCount,
    viewerCount,
    setViewerCount,
    isBookmarked,
    setIsBookmarked,
    isLive,
    isRefreshingUrl,
    setIsRefreshingUrl,
    videoLoadError,
    setVideoLoadError,
    isVideoPlaying,
    setIsVideoPlaying,
    showVideoOverlay,
    setShowVideoOverlay,
    isItemInLibrary,
    mappedContent,
    likeAnimation,
    heartAnimation,
    commentAnimation,
    livePulseAnimation,
    safeLibraryStore,
    directLibraryStore,
  };
}
