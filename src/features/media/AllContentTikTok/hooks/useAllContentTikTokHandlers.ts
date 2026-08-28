/**
 * useAllContentTikTokHandlers - All event handlers for the content feed
 */
import { useCallback } from "react";
import { Alert, Share } from "react-native";
import { useCommentModal } from "../../../../../app/context/CommentModalContext";
import { mapContentTypeForBackend } from "../../../../../app/utils/engagementHelpers";
import { resolveLikeSeed } from "../../../../shared/hooks/useContentLikeState";
import { useVideoNavigation } from "../../../../../app/hooks/useVideoNavigation";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { useInteractionStore } from "@/store/useInteractionStore";
import { useLibraryStore } from "@/store/useLibraryStore";
import {
  convertToDownloadableItem,
  useDownloadHandler,
} from "../../../../../app/utils/downloadUtils";
import type { ContentType, MediaItem } from "../../../../shared/types";
import { detectMediaType } from "../../../../shared/utils";
import { recordFeedAffinity } from "../utils/feedAffinityStore";
import { mirrorFeedEngagementEvent } from "../../../../shared/feed";

let lastLikeRateLimitAlertAt = 0;

function notifyLikeRateLimited(message?: string) {
  const now = Date.now();
  if (now - lastLikeRateLimitAlertAt < 2500) return;
  lastLikeRateLimitAlertAt = now;
  Alert.alert(
    "Slow down",
    message || "Please wait a moment before liking again."
  );
}

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
  playingAudioId: string | null;
  playMedia: (key: string, type: "video" | "audio") => void;
  pauseMedia: (key: string) => void;
  pauseAllAudio: () => void;
  setModalVisible: (v: string | null) => void;
  setSuccessMessage: (m: string) => void;
  setShowSuccessCard: (v: boolean) => void;
  setCurrentlyVisibleVideo: (v: string | null) => void;
  refreshAllContent: () => Promise<void>;
  reshuffleFeed?: () => Promise<void>;
  setRefreshing: (v: boolean) => void;
  toggleLike: (
    contentId: string,
    contentType: string,
    options?: { initialLikes?: number; initialLiked?: boolean }
  ) => Promise<any>;
  toggleSave: (contentId: string, contentType: string) => Promise<void>;
  recordShare: (contentId: string, contentType: string, shareMethod?: string) => Promise<void>;
  loadDownloadedItems: () => Promise<void>;
}

export function useAllContentTikTokHandlers(params: UseAllContentTikTokHandlersParams) {
  const {
    contentType,
    filteredMediaList,
    categorizedContent,
    getContentKey: getKey,
    getTimeAgo,
    getLikeCount,
    getCommentCount,
    getUserSaveState,
    playingAudioId,
    playMedia,
    pauseMedia,
    pauseAllAudio,
    setModalVisible,
    setSuccessMessage,
    setShowSuccessCard,
    setCurrentlyVisibleVideo,
    refreshAllContent,
    reshuffleFeed,
    setRefreshing,
    toggleLike,
    toggleSave,
    recordShare,
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
        const isPlaceholder = (s?: string) =>
          !s || /^(anonymous(\s+user)?|unknown|no speaker|user)$/i.test(s.trim());
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
          !isObjectId(uploadedBy) &&
          !isPlaceholder(uploadedBy)
        ) {
          uploadedByName = uploadedBy;
        }
        if (
          speaker &&
          typeof speaker === "string" &&
          speaker.trim().length > 0 &&
          !isObjectId(speaker) &&
          !isPlaceholder(speaker)
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
          contentStats: useInteractionStore.getState().contentStats,
          globalFavoriteCounts: {},
          getContentKey: getKey,
          getTimeAgo,
          getDisplayName: buildDisplayName,
          source: "AllContentTikTok",
          category: contentType as any,
        });
      }
    },
    [
      navigateToReels,
      categorizedContent.videos,
      categorizedContent.sermons,
      getKey,
      getTimeAgo,
      contentType,
    ]
  );

  const handleLike = useCallback(
    async (key: string, item: MediaItem) => {
      try {
        const contentId = item._id || key;
        const contentType = item.contentType || "media";
        // Shared with Reels so both surfaces seed the optimistic flip
        // identically — see resolveLikeSeed.
        const result = await toggleLike(
          contentId,
          contentType,
          resolveLikeSeed(contentId, item as any)
        );
        if (result?.authRequired) {
          return;
        }
        if (result?.rateLimited) {
          notifyLikeRateLimited(result.message);
          return;
        }
        // Train on-device affinity when the heart ends liked
        if (result?.liked) {
          void recordFeedAffinity(item, 1.5);
          mirrorFeedEngagementEvent(
            contentId,
            "like",
            item.contentType || "media",
            "for_you"
          );
        }
      } catch (error) {
        console.error(`❌ Failed to toggle like for ${item.title}:`, error);
      }
    },
    [toggleLike]
  );

  const handleComment = useCallback(
    (
      key: string,
      item: MediaItem,
      anchor?: { mediaBottomY: number; mediaHeight?: number } | null
    ) => {
      const contentId = item._id || key;
      const mapped = mapContentTypeForBackend(item.contentType || "media");
      const uploadedBy = item.uploadedBy as any;
      const creatorId =
        typeof uploadedBy === "string"
          ? uploadedBy
          : String(uploadedBy?._id || uploadedBy?.id || "");
      const creatorName = (() => {
        const fromAuthor =
          (item as any).authorInfo?.fullName ||
          [
            (item as any).authorInfo?.firstName,
            (item as any).authorInfo?.lastName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();
        const fromUploaded =
          typeof uploadedBy === "object"
            ? `${uploadedBy?.firstName || ""} ${uploadedBy?.lastName || ""}`.trim() ||
              uploadedBy?.fullName ||
              uploadedBy?.username ||
              ""
            : "";
        const raw = fromAuthor || item.speaker || fromUploaded || "";
        if (!raw || /^(anonymous(\s+user)?|unknown)$/i.test(String(raw).trim())) {
          return "";
        }
        return String(raw).trim();
      })();
      const creatorAvatar =
        item.speakerAvatar ||
        (item as any).authorInfo?.avatar ||
        (typeof uploadedBy === "object"
          ? uploadedBy?.avatar || uploadedBy?.avatarUrl
          : undefined);

      showCommentModal(
        [],
        contentId,
        mapped === "devotional" ? "devotional" : "media",
        creatorName || undefined,
        creatorName
          ? {
              userId: creatorId,
              displayName: creatorName,
              avatar: creatorAvatar,
            }
          : null,
        anchor ?? null
      );
    },
    [showCommentModal]
  );

  const handleSave = useCallback(
    async (key: string, item: MediaItem) => {
      try {
        const contentId = item._id || key;
        const contentType = item.contentType || "media";
        const prevSaved = Boolean(
          useInteractionStore.getState().contentStats[contentId]?.userInteractions
            ?.saved
        );

        // Instant feedback — don't wait for API or AsyncStorage
        setSuccessMessage(prevSaved ? "Removed from library!" : "Saved to library!");
        setShowSuccessCard(true);
        setModalVisible(null);

        const result = await toggleSave(contentId, contentType);
        if (result?.authRequired) {
          setShowSuccessCard(false);
          return;
        }

        // Correct toast if server flipped differently than optimistic guess
        setSuccessMessage(
          result.saved ? "Saved to library!" : "Removed from library!"
        );

        if (result.saved) {
          mirrorFeedEngagementEvent(
            contentId,
            "save",
            contentType,
            "for_you"
          );
          const libraryItem = {
            id: contentId,
            contentType: item.contentType || "content",
            fileUrl: item.fileUrl,
            title: item.title,
            speaker: item.speaker,
            uploadedBy: typeof item.uploadedBy === "string" ? item.uploadedBy : undefined,
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
          void libraryStore.addToLibrary(libraryItem);
        } else {
          void libraryStore.removeFromLibrary(contentId);
        }
      } catch (error) {
        console.error("❌ Save error:", error);
        setSuccessMessage("Couldn't save — media may be unavailable");
        setShowSuccessCard(true);
        setModalVisible(null);
      }
    },
    [
      toggleSave,
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
        const contentId = item._id || key;
        const contentType = mapContentTypeForBackend(item.contentType || "media");
        const result = await Share.share({
          title: item.title,
          message: `Check this out: ${item.title}\n${item.fileUrl}`,
          url: item.fileUrl,
        });

        // User closed the sheet — do not ping analytics
        if (result.action === Share.dismissedAction) {
          return;
        }

        if (result.action === Share.sharedAction) {
          // Soft-fails on 404; never surfaces an error for dismiss/analytics miss
          await recordShare(
            contentId,
            contentType,
            result.activityType || "generic"
          );
          mirrorFeedEngagementEvent(
            contentId,
            "share",
            item.contentType || "media",
            "for_you"
          );
        }
      } catch (err) {
        // User cancelled share sheet (some Android OEMs throw) — ignore
        const msg = err instanceof Error ? err.message : String(err);
        if (/cancel|dismiss|abort/i.test(msg)) return;
        if (__DEV__) console.warn("Share sheet error:", msg);
      } finally {
        setModalVisible(null);
      }
    },
    [recordShare, setModalVisible]
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
      // Playback keys may be scoped as `${tab}::${contentKey}`.
      const contentKey = key.includes("::") ? key.split("::").slice(1).join("::") : key;
      const mediaItem = filteredMediaList.find(
        (item) => getKey(item) === contentKey || getKey(item) === key
      );
      const mediaType = detectMediaType(mediaItem || null);
      const isAudio = mediaType === "audio";
      const isCurrentlyPlaying = isAudio
        ? playingAudioId === key ||
          playingAudioId === contentKey ||
          playingAudioId === mediaItem?._id ||
          (!!playingAudioId &&
            (key.includes(playingAudioId) || contentKey.includes(playingAudioId)))
        : useGlobalVideoStore.getState().playingVideos[key] ??
          useGlobalVideoStore.getState().playingVideos[contentKey] ??
          false;

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
      playingAudioId,
      setCurrentlyVisibleVideo,
    ]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // New shuffle seed first so UI order changes even if network is cached
      await reshuffleFeed?.();
      await refreshAllContent();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllContent, reshuffleFeed, setRefreshing]);

  return {
    handleVideoTap,
    handleLike,
    handleComment,
    handleSave,
    handleShare,
    handleDownloadPress,
    handleRefresh,
    togglePlay,
    checkIfDownloaded,
  };
}
