import { Animated } from "react-native";
import { useCallback } from "react";
import { useGlobalMediaStore } from "../../../store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../../../store/useGlobalVideoStore";
import { getUserDisplayNameFromContent } from "../../../utils/userValidation";
import { getTimeAgo } from "../utils";
import type { ContentCardProps } from "../types";

interface HandlersParams {
  content: ContentCardProps["content"];
  onLike: ContentCardProps["onLike"];
  onComment: ContentCardProps["onComment"];
  onShare: ContentCardProps["onShare"];
  onSaveToLibrary?: ContentCardProps["onSaveToLibrary"];
  socketManager?: ContentCardProps["socketManager"];
  key: string;
  modalKey: string;
  isLiked: boolean;
  likeCount: number;
  isItemInLibrary: boolean;
  viewCounted: boolean;
  contentStats: Record<string, any>;
  setContentStats: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setIsLiked: React.Dispatch<React.SetStateAction<boolean>>;
  setLikeCount: React.Dispatch<React.SetStateAction<number>>;
  setShareCount: React.Dispatch<React.SetStateAction<number>>;
  setIsBookmarked: React.Dispatch<React.SetStateAction<boolean>>;
  setViewCounted: React.Dispatch<React.SetStateAction<boolean>>;
  isVideoPlaying: boolean;
  setIsVideoPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setShowVideoOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  setVideoLoadError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsRefreshingUrl: React.Dispatch<React.SetStateAction<boolean>>;
  likeAnimation: Animated.Value;
  heartAnimation: Animated.Value;
  commentAnimation: Animated.Value;
  safeLibraryStore: any;
}

export function useContentCardHandlers(params: HandlersParams) {
  const {
    content,
    onLike,
    onComment,
    onShare,
    onSaveToLibrary,
    socketManager,
    key,
    modalKey,
    isLiked,
    likeCount,
    isItemInLibrary,
    viewCounted,
    contentStats,
    setContentStats,
    setIsLiked,
    setLikeCount,
    setShareCount,
    setIsBookmarked,
    setViewCounted,
    isVideoPlaying,
    setIsVideoPlaying,
    setShowVideoOverlay,
    setVideoLoadError,
    setIsRefreshingUrl,
    likeAnimation,
    heartAnimation,
    commentAnimation,
    safeLibraryStore,
  } = params;

  const globalVideoStore = useGlobalVideoStore();
  const globalMediaStore = useGlobalMediaStore();

  const animateLike = useCallback(() => {
    Animated.sequence([
      Animated.timing(likeAnimation, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(likeAnimation, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(heartAnimation, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(heartAnimation, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [likeAnimation, heartAnimation]);

  const animateComment = useCallback(() => {
    Animated.sequence([
      Animated.timing(commentAnimation, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(commentAnimation, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [commentAnimation]);

  const incrementView = useCallback(() => {
    if (!viewCounted) {
      setContentStats((prev) => ({
        ...prev,
        [key]: { ...prev[key], views: (prev[key]?.views || content.viewCount) + 1 },
      }));
      setViewCounted(true);
    }
  }, [viewCounted, key, content.viewCount, setContentStats, setViewCounted]);

  const toggleVideoPlay = useCallback(() => {
    if (content.contentType === "video") {
      globalMediaStore.playMediaGlobally(modalKey, "video");
      const newPlayingState = !isVideoPlaying;
      setIsVideoPlaying(newPlayingState);
      setShowVideoOverlay(!newPlayingState);
      if (newPlayingState) incrementView();
    }
  }, [
    content.contentType,
    modalKey,
    isVideoPlaying,
    globalMediaStore,
    setIsVideoPlaying,
    setShowVideoOverlay,
    incrementView,
  ]);

  const toggleMute = useCallback(() => globalVideoStore.toggleVideoMute(modalKey), [globalVideoStore, modalKey]);

  const handleFavorite = useCallback(async () => {
    try {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState);
      setLikeCount(newLikedState ? likeCount + 1 : likeCount - 1);
      animateLike();
      if (socketManager) socketManager.sendLike(content._id, "media");
      await onLike(content._id, newLikedState);
    } catch {
      setIsLiked(!isLiked);
      setLikeCount(likeCount);
    }
  }, [isLiked, likeCount, content._id, onLike, socketManager, animateLike, setIsLiked, setLikeCount]);

  const handleComment = useCallback(() => {
    animateComment();
    onComment(content._id);
  }, [animateComment, onComment, content._id]);

  const handleShare = useCallback(async () => {
    try {
      await onShare(content._id);
      setShareCount((c) => c + 1);
    } catch (e) {
      console.error("Error sharing content:", e);
    }
  }, [onShare, content._id, setShareCount]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!onSaveToLibrary) return;
    try {
      const newBookmarkState = !isItemInLibrary;
      setIsBookmarked(newBookmarkState);
      setContentStats((prev) => ({ ...prev, [key]: { ...prev[key], saved: newBookmarkState ? 1 : 0 } }));
      await onSaveToLibrary(content._id, isItemInLibrary);
    } catch {
      setIsBookmarked(isItemInLibrary);
      setContentStats((prev) => ({ ...prev, [key]: { ...prev[key], saved: isItemInLibrary ? 1 : 0 } }));
    }
  }, [onSaveToLibrary, isItemInLibrary, content._id, key, setIsBookmarked, setContentStats]);

  const handleSave = useCallback(async () => {
    if (onSaveToLibrary) return handleSaveToLibrary();
    const isSaved = contentStats[key]?.saved === 1;
    const libraryItem = {
      id: key,
      contentType: content.contentType,
      fileUrl: content.mediaUrl,
      title: content.title,
      speaker: getUserDisplayNameFromContent(content),
      uploadedBy: content.author?._id || content.authorInfo?._id,
      description: content.description,
      createdAt: content.createdAt,
      speakerAvatar: content.author?.avatar || content.authorInfo?.avatar,
      views: contentStats[key]?.views || content.viewCount,
      sheared: contentStats[key]?.sheared || content.shareCount,
      favorite: contentStats[key]?.favorite || content.likeCount,
      comment: contentStats[key]?.comment || content.commentCount,
      saved: 1,
      imageUrl: content.thumbnailUrl || content.mediaUrl,
      thumbnailUrl: content.thumbnailUrl,
      originalKey: key,
    };
    if (!isSaved) await safeLibraryStore.addToLibrary(libraryItem);
    else await safeLibraryStore.removeFromLibrary(key);
    setContentStats((prev) => ({ ...prev, [key]: { ...prev[key], saved: isSaved ? 0 : 1 } }));
  }, [
    onSaveToLibrary,
    contentStats,
    key,
    content,
    safeLibraryStore,
    handleSaveToLibrary,
    setContentStats,
  ]);

  const handleDoubleTap = useCallback(() => {
    if (!isLiked) handleFavorite();
  }, [isLiked, handleFavorite]);

  const handleLongPress = useCallback(() => handleSaveToLibrary(), [handleSaveToLibrary]);

  const handleVideoUrlRefresh = useCallback(async () => {
    setIsRefreshingUrl(true);
    setVideoLoadError(null);
    try {
      setIsVideoPlaying(false);
      setShowVideoOverlay(true);
    } catch {
      setVideoLoadError("Failed to refresh video URL");
    } finally {
      setIsRefreshingUrl(false);
    }
  }, [setIsRefreshingUrl, setVideoLoadError, setIsVideoPlaying, setShowVideoOverlay]);

  return {
    getTimeAgo,
    animateLike,
    animateComment,
    toggleVideoPlay,
    toggleMute,
    handleFavorite,
    handleComment,
    handleShare,
    handleSaveToLibrary,
    handleSave,
    handleDoubleTap,
    handleLongPress,
    incrementView,
    handleVideoUrlRefresh,
  };
}
