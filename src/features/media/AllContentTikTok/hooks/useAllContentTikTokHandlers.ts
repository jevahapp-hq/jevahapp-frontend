/**
 * useAllContentTikTokHandlers - All event handlers for the content feed
 */
import { useCallback } from "react";
import { Share } from "react-native";
import { useCommentModal } from "../../../../../app/context/CommentModalContext";
import { useVideoNavigation } from "../../../../../app/hooks/useVideoNavigation";
import { useInteractionStore } from "../../../../../app/store/useInteractionStore";
import { useLibraryStore } from "../../../../../app/store/useLibraryStore";
import {
  convertToDownloadableItem,
  useDownloadHandler,
} from "../../../../../app/utils/downloadUtils";
import type { ContentType, MediaItem } from "../../../../shared/types";
import { detectMediaType } from "../../../../shared/utils";

export interface UseAllContentTikTokHandlersParams {
  contentType: ContentType | "ALL";
  filteredMediaList: MediaItem[];
  categorizedContent: {
    videos: MediaItem[];
    music: MediaItem[];
    ebooks: MediaItem[];
    sermons: MediaItem[];
  };
  contentStats: Record<string, any>;
  getContentKey: (item: MediaItem) => string;
  getTimeAgo: (date: string) => string;
  getLikeCount: (contentId: string) => number;
  getCommentCount: (contentId: string) => number;
  getUserSaveState: (contentId: string) => boolean;
  playingVideos: Record<string, boolean>;
  playingAudioId: string | null;
  playMedia: (key: string, type: "video" | "audio") => void;
  pauseMedia: (key: string) => void;
  pauseAllAudio: () => void;
  setModalVisible: (v: string | null) => void;
  setSuccessMessage: (m: string) => void;
  setShowSuccessCard: (v: boolean) => void;
  setCurrentlyVisibleVideo: (v: string | null) => void;
  refreshAllContent: () => Promise<void>;
  setRefreshing: (v: boolean) => void;
  socketManager: any;
  toggleLike: (contentId: string, contentType: string) => Promise<void>;
  toggleSave: (contentId: string, contentType: string) => Promise<void>;
  loadDownloadedItems: () => Promise<void>;
}

export function useAllContentTikTokHandlers(params: UseAllContentTikTokHandlersParams) {
  const {
    contentType,
    filteredMediaList,
    categorizedContent,
    contentStats,
    getContentKey: getKey,
    getTimeAgo,
    getLikeCount,
    getCommentCount,
    getUserSaveState,
    playingVideos,
    playingAudioId,
    playMedia,
    pauseMedia,
    pauseAllAudio,
    setModalVisible,
    setSuccessMessage,
    setShowSuccessCard,
    setCurrentlyVisibleVideo,
    refreshAllContent,
    setRefreshing,
    socketManager,
    toggleLike,
    toggleSave,
    loadDownloadedItems,
  } = params;

  const { showCommentModal } = useCommentModal();
  const libraryStore = useLibraryStore();
  const { navigateToReels } = useVideoNavigation();
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();

  const handleVideoTap = useCallback(
    (key: string, video: MediaItem, index: number) => {
      const buildDisplayName = (speaker?: string, uploadedBy?: string | object) => {
        const isObjectId = (s: string) =>
          typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s.trim());
        let uploadedByName = "";
        if (uploadedBy && typeof uploadedBy === "object") {
          const u = uploadedBy as any;
          uploadedByName =
            u.firstName && u.lastName
              ? `${u.firstName} ${u.lastName}`.trim()
              : u.firstName || u.fullName || u.name || "";
        } else if (
          uploadedBy &&
          typeof uploadedBy === "string" &&
          !isObjectId(uploadedBy)
        ) {
          uploadedByName = uploadedBy;
        }
        if (
          speaker &&
          typeof speaker === "string" &&
          speaker.trim().length > 0 &&
          !isObjectId(speaker)
        )
          return speaker;
        if (uploadedByName) return uploadedByName;
        return "Unknown";
      };

      if (video && index !== undefined) {
        const allVideoContent = [
          ...categorizedContent.videos,
          ...categorizedContent.sermons.filter(
            (s) => detectMediaType(s) === "video"
          ),
        ];
        const actualIndex = allVideoContent.findIndex(
          (v) => getKey(v) === key
        );
        const finalIndex = actualIndex >= 0 ? actualIndex : index;

        navigateToReels({
          video: video as any,
          index: finalIndex,
          allVideos: allVideoContent as any,
          contentStats,
          globalFavoriteCounts: {},
          getContentKey: getKey,
          getTimeAgo,
          getDisplayName: buildDisplayName,
          source: "AllContentTikTok",
          category: contentType,
        });
      }
    },
    [
      navigateToReels,
      categorizedContent.videos,
      categorizedContent.sermons,
      contentStats,
      getKey,
      getTimeAgo,
      contentType,
    ]
  );

  const handleLike = useCallback(
    async (contentId: string, contentType: string) => {
      if (socketManager?.isConnected()) {
        socketManager.sendLike(contentId, "media");
      }
      try {
        await toggleLike(contentId, contentType);
      } catch (error) {
        console.error("❌ Like error:", error);
      }
    },
    [socketManager, toggleLike]
  );

  const handleComment = useCallback(
    (key: string, item: MediaItem) => {
      const contentId = item._id || key;
      showCommentModal([], contentId, "media");
    },
    [showCommentModal]
  );

  const handleSave = useCallback(
    async (key: string, item: MediaItem) => {
      try {
        const contentId = item._id || key;
        const contentType = item.contentType || "media";
        await toggleSave(contentId, contentType);

        const isSaved = getUserSaveState(contentId);
        if (!isSaved) {
          const libraryItem = {
            id: contentId,
            contentType: item.contentType || "content",
            fileUrl: item.fileUrl,
            title: item.title,
            speaker: item.speaker,
            uploadedBy: item.uploadedBy,
            description: item.description,
            createdAt: item.createdAt || new Date().toISOString(),
            speakerAvatar: item.speakerAvatar,
            views: getLikeCount(contentId) || item.views || 0,
            shares: 0,
            likes: getLikeCount(contentId) || item.likes || 0,
            comments: getCommentCount(contentId) || item.comment || 0,
            saved: 1,
            imageUrl: item.imageUrl,
            thumbnailUrl: (() => {
              if (
                item.contentType === "videos" &&
                typeof item.fileUrl === "string"
              ) {
                return (
                  item.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg"
                );
              }
              if (typeof item.imageUrl === "string") return item.imageUrl;
              return typeof item.fileUrl === "string" ? item.fileUrl : "";
            })(),
            originalKey: key,
          };
          await libraryStore.addToLibrary(libraryItem);
          setSuccessMessage("Saved to library!");
        } else {
          await libraryStore.removeFromLibrary(contentId);
          setSuccessMessage("Removed from library!");
        }
        setShowSuccessCard(true);
      } catch (error) {
        console.error("❌ Save error:", error);
      }
      setModalVisible(null);
    },
    [
      toggleSave,
      getUserSaveState,
      getLikeCount,
      getCommentCount,
      libraryStore,
      setSuccessMessage,
      setShowSuccessCard,
      setModalVisible,
    ]
  );

  const handleShare = useCallback(
    async (key: string, item: MediaItem) => {
      try {
        await Share.share({
          title: item.title,
          message: `Check this out: ${item.title}\n${item.fileUrl}`,
          url: item.fileUrl,
        });
      } catch (err) {
        console.warn("❌ Share error:", err);
      }
      setModalVisible(null);
    },
    [setModalVisible]
  );

  const handleFavorite = useCallback(
    async (key: string, item: MediaItem) => {
      try {
        const contentId = item._id || key;
        const contentType = item.contentType || "media";
        await handleLike(contentId, contentType);
      } catch (error) {
        console.error(`❌ Failed to toggle like for ${item.title}:`, error);
      }
    },
    [handleLike]
  );

  const handleDownloadPress = useCallback(
    async (item: MediaItem) => {
      const downloadableItem = convertToDownloadableItem(
        item,
        item.contentType as "video" | "audio" | "ebook"
      );
      const result = await handleDownload(downloadableItem);
      if (result.success) {
        setSuccessMessage("Downloaded successfully!");
        setShowSuccessCard(true);
        await loadDownloadedItems();
      }
    },
    [handleDownload, loadDownloadedItems, setSuccessMessage, setShowSuccessCard]
  );

  const togglePlay = useCallback(
    (key: string) => {
      const mediaItem = filteredMediaList.find((item) => getKey(item) === key);
      const mediaType = detectMediaType(mediaItem || null);
      const isAudio = mediaType === "audio";
      const isCurrentlyPlaying = isAudio
        ? playingAudioId === key
        : playingVideos[key] ?? false;

      if (isCurrentlyPlaying) {
        if (isAudio) pauseAllAudio();
        else pauseMedia(key);
        return;
      }

      setCurrentlyVisibleVideo(key);
      playMedia(key, isAudio ? "audio" : "video");
    },
    [
      filteredMediaList,
      getKey,
      playMedia,
      pauseMedia,
      pauseAllAudio,
      playingVideos,
      playingAudioId,
      setCurrentlyVisibleVideo,
    ]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllContent();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllContent, setRefreshing]);

  return {
    handleVideoTap,
    handleLike,
    handleComment,
    handleSave,
    handleShare,
    handleFavorite,
    handleDownloadPress,
    handleRefresh,
    togglePlay,
    checkIfDownloaded,
  };
}
