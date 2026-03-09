/**
 * useReelsHandlers
 * Centralizes all user interaction handlers (like, comment, save, share, etc.).
 * Easier to debug and test - errors point to this file.
 */
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Share } from "react-native";
import allMediaAPI from "../../utils/allMediaAPI";
import { getPersistedStats, persistStats } from "../../utils/persistentStorage";

export interface UseReelsHandlersParams {
  router: ReturnType<typeof useRouter>;
  contentId: string | null;
  contentIdForHooks: string;
  canUseBackendLikes: boolean;
  activeContentType: string;
  currentVideo: any;
  modalKey: string;
  menuVisible: boolean;
  videoStats: Record<string, any>;
  setVideoStats: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setMenuVisible: (v: boolean | ((p: boolean) => boolean)) => void;
  setShowDetailsModal: (v: boolean) => void;
  setShowReportModal: (v: boolean) => void;
  source?: string;
  category?: string;
  title: string;
  speaker: string;
  timeAgo: string;
  imageUrl: string;
  sheared: string;
  toggleLike: (contentId: string, contentType: string) => Promise<void>;
  showCommentModal: (comments: any[], contentId: string, type: string, speaker?: any) => void;
  libraryStore: any;
  handleDownload: (item: any) => Promise<void>;
  openDeleteModal: () => void;
  handleDeleteConfirmInternal: () => Promise<void>;
  triggerHapticFeedback: () => void;
}

export function useReelsHandlers({
  router,
  contentId,
  contentIdForHooks,
  canUseBackendLikes,
  activeContentType,
  currentVideo,
  modalKey,
  menuVisible,
  videoStats,
  setVideoStats,
  setMenuVisible,
  setShowDetailsModal,
  setShowReportModal,
  source,
  category,
  title,
  speaker,
  timeAgo,
  imageUrl,
  sheared,
  params,
  toggleLike,
  showCommentModal,
  libraryStore,
  handleDownload,
  openDeleteModal,
  handleDeleteConfirmInternal,
  triggerHapticFeedback,
}: UseReelsHandlersParams) {
  const handleBackNavigation = useCallback(() => {
    triggerHapticFeedback();
    if (source === "Downloads") {
      router.replace("/downloads/DownloadsScreen");
      return;
    }
    if (source === "AllContentTikTok") {
      router.replace({
        pathname: "/categories/HomeScreen",
        params: { default: "Home", defaultCategory: category || "ALL" },
      });
      return;
    }
    if (router.canGoBack?.()) {
      router.back();
      return;
    }
    if (source === "VideoComponent") router.push("/categories/VideoComponent");
    else if (source === "SermonComponent") router.push("/categories/SermonComponent");
    else if (source === "LiveComponent") router.push("/categories/LiveComponent");
    else if (source === "ExploreSearch") router.push("/ExploreSearch/ExploreSearch");
    else if (source === "HorizontalVideoSection") router.push("/");
    else {
      router.push({
        pathname: "/categories/HomeScreen",
        params: { default: "Home", defaultCategory: category || "ALL" },
      });
    }
  }, [router, source, category, triggerHapticFeedback]);

  const tryRefreshMediaUrl = useCallback(async (item: any): Promise<string | null> => {
    try {
      if (!item?.title) return null;
      const response = await allMediaAPI.getAllMedia({
        search: item.title,
        contentType: item.contentType as any,
        limit: 1,
      });
      const fresh = response?.media?.[0];
      if (fresh?.fileUrl && typeof fresh.fileUrl === "string" && fresh.fileUrl.trim())
        return fresh.fileUrl.trim();
      return null;
    } catch (e) {
      console.error("❌ Refresh media URL failed in reels:", e);
      return null;
    }
  }, []);

  const handleLike = useCallback(async () => {
    try {
      if (!canUseBackendLikes) return;
      await toggleLike(contentIdForHooks, activeContentType);
    } catch (e) {
      console.error("❌ Error toggling like in reels:", e);
    }
  }, [canUseBackendLikes, contentIdForHooks, activeContentType, toggleLike]);

  const handleComment = useCallback(
    (key: string) => {
      const commentContentId = contentId || key;
      showCommentModal([], commentContentId, "media", currentVideo.speaker);
    },
    [contentId, showCommentModal, currentVideo?.speaker]
  );

  const handleSave = useCallback(
    async (key: string) => {
      try {
        const isSaved = libraryStore.isItemSaved(key);
        if (isSaved) {
          libraryStore.removeFromLibrary(key);
        } else {
          libraryStore.addToLibrary({
            id: key,
            title: currentVideo.title || title,
            speaker: currentVideo.speaker || speaker,
            timeAgo: currentVideo.timeAgo || timeAgo,
            contentType: "Reel",
            fileUrl: currentVideo.fileUrl || imageUrl,
            thumbnailUrl: currentVideo.imageUrl || currentVideo.thumbnailUrl || imageUrl,
            originalKey: key,
            createdAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("❌ Error handling save:", e);
      }
    },
    [libraryStore, currentVideo, title, speaker, timeAgo, imageUrl]
  );

  const handleShare = useCallback(
    async (key: string) => {
      try {
        const shareOptions = {
          title: currentVideo.title,
          message: `Check out this video: ${currentVideo.title}`,
          url: currentVideo.fileUrl || currentVideo.imageUrl || imageUrl,
        };
        const result = await Share.share(shareOptions);
        if (result.action === Share.sharedAction) {
          const currentStats = videoStats[key] || {};
          const newShared = (currentStats.sheared || parseInt(sheared) || 0) + 1;
          setVideoStats((prev) => ({
            ...prev,
            [key]: { ...prev[key], sheared: newShared },
          }));
          const allStats = await getPersistedStats();
          allStats[key] = { ...currentStats, sheared: newShared };
          persistStats(allStats);
        }
        setMenuVisible(false);
      } catch (e) {
        console.error("❌ Error handling share:", e);
        setMenuVisible(false);
      }
    },
    [currentVideo, imageUrl, sheared, videoStats, setVideoStats, setMenuVisible]
  );

  const handleDownloadAction = useCallback(async () => {
    try {
      const item = {
        id: currentVideo._id || modalKey,
        title: currentVideo.title || title,
        description: currentVideo.description || "",
        author: currentVideo.speaker || speaker || "Unknown",
        contentType: "video" as const,
        fileUrl: currentVideo.fileUrl || imageUrl,
        thumbnailUrl: currentVideo.imageUrl || imageUrl,
      };
      await handleDownload(item);
      setMenuVisible(false);
    } catch (e) {
      console.error("Error downloading video:", e);
    }
  }, [
    currentVideo,
    modalKey,
    title,
    speaker,
    imageUrl,
    handleDownload,
    setMenuVisible,
  ]);

  const handleViewDetails = useCallback(() => {
    setMenuVisible(false);
    setShowDetailsModal(true);
  }, [setMenuVisible, setShowDetailsModal]);

  const handleDeleteConfirm = useCallback(async () => {
    await handleDeleteConfirmInternal();
    setMenuVisible(false);
  }, [handleDeleteConfirmInternal, setMenuVisible]);

  const handleReport = useCallback(() => {
    setMenuVisible(false);
    setShowReportModal(true);
  }, [setMenuVisible, setShowReportModal]);

  return {
    handleBackNavigation,
    tryRefreshMediaUrl,
    handleLike,
    handleComment,
    handleSave,
    handleShare,
    handleDownloadAction,
    handleViewDetails,
    handleDeleteConfirm,
    handleReport,
    openDeleteModal,
  };
}
