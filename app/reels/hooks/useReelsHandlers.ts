/**
 * useReelsHandlers
 * Centralizes all user interaction handlers (like, comment, save, share, etc.).
 * Easier to debug and test - errors point to this file.
 */
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert, Share } from "react-native";
import allMediaAPI from "../../utils/allMediaAPI";
import { ensureAuthenticatedForInteraction } from "../../utils/auth/requireAuthForInteraction";
import { useInteractionStore } from "@/store/useInteractionStore";
import {
  getVideoPlaybackSnapshot,
  resolveRegisteredVideoKey,
  useGlobalVideoStore,
} from "@/store/useGlobalVideoStore";
import { useReelsStore } from "@/store/useReelsStore";
import { mapContentTypeForBackend } from "../../utils/engagementHelpers";
import {
  ensureTabPrefixedFeedKey,
  isHomeOriginReelsSource,
  resolveReturnHomeCategory,
} from "../../../src/features/media/video-feed";
import { rememberHomeFeedCategory, readHomeFeedCategory } from "../../../src/shared/media/homeFeedCategory";
import { savePlayhead } from "../../../src/features/media/video-feed/playheadCache";
import { getBestVideoUrl } from "../../../src/shared/utils/videoUrlManager";
import {
  fullscreenReelsCommentAnchor,
  type CommentMediaAnchor,
} from "../../components/commentSheetAnchor";
import type { CommentCreatorInfo } from "../../context/commentModalTypes";
import { resolveSaveSeed } from "../../../src/shared/hooks/useContentSaveState";

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
  showCommentModal: (
    comments: any[],
    contentId: string,
    type: string,
    speaker?: any,
    creator?: CommentCreatorInfo | null,
    anchor?: CommentMediaAnchor | null
  ) => void;
  libraryStore: any;
  handleDownload: (item: any) => Promise<void>;
  openDeleteModal: () => void;
  handleDeleteConfirmInternal: () => Promise<void>;
  triggerHapticFeedback: () => void;
  getVideoPositionMs?: () => number;
  setSuccessMessage: (m: string) => void;
  setShowSuccessCard: (v: boolean) => void;
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
  toggleLike,
  showCommentModal,
  libraryStore,
  handleDownload,
  openDeleteModal,
  handleDeleteConfirmInternal,
  triggerHapticFeedback,
  getVideoPositionMs,
  setSuccessMessage,
  setShowSuccessCard,
}: UseReelsHandlersParams) {
  const persistFeedResumeFromReels = useCallback(() => {
    try {
      const reels = useReelsStore.getState();
      const activeIndex = Math.max(0, reels.currentIndex || 0);
      const active =
        reels.videoList[activeIndex] || reels.videoList[0];
      const contentId = String(
        active?._id || (active as any)?.id || contentIdForHooks || ""
      ).trim();
      const visibleKey = useGlobalVideoStore.getState().currentlyVisibleVideo;
      const snap =
        getVideoPlaybackSnapshot(modalKey) ||
        (contentId
          ? getVideoPlaybackSnapshot(
              resolveRegisteredVideoKey(contentId) || ""
            )
          : null) ||
        (visibleKey ? getVideoPlaybackSnapshot(visibleKey) : null);
      const prev = reels.resumePlayback;
      const liveMs = getVideoPositionMs?.() ?? 0;
      const positionMs =
        snap?.currentMs ??
        (liveMs > 0 ? liveMs : undefined) ??
        (prev?.contentId && String(prev.contentId) === contentId
          ? prev.positionMs
          : 0) ??
        0;
      if (!contentId) return;
      const fromHome = isHomeOriginReelsSource(source);
      const tab = fromHome
        ? resolveReturnHomeCategory(
            prev?.feedKey,
            category,
            readHomeFeedCategory()
          )
        : undefined;
      const feedKey = ensureTabPrefixedFeedKey(
        prev?.feedKey,
        contentId,
        tab
      );
      if (fromHome && tab) rememberHomeFeedCategory(tab);
      reels.setResumePlayback({
        contentId,
        positionMs,
        feedKey,
        reelsIndex: activeIndex,
        target: "feed",
      });
      const url =
        (active as any)?.fileUrl ||
        (active as any)?.playbackUrl ||
        (active as any)?.hlsUrl;
      if (positionMs > 150) {
        const variants = [
          (active as any)?.fileUrl,
          (active as any)?.playbackUrl,
          (active as any)?.hlsUrl,
        ].filter((u): u is string => typeof u === "string" && u.length > 0);
        const seconds = positionMs / 1000;
        for (const variant of variants) {
          savePlayhead(variant, seconds);
          savePlayhead(getBestVideoUrl(variant), seconds);
        }
        if (typeof url === "string") {
          savePlayhead(url, seconds);
        }
      }
    } catch {
      // best-effort
    }
  }, [category, contentIdForHooks, getVideoPositionMs, modalKey, source]);

  const goHomeToCategory = useCallback(
    (homeCategory: string) => {
      rememberHomeFeedCategory(homeCategory);
      router.replace({
        pathname: "/categories/HomeScreen",
        params: { default: "Home", defaultCategory: homeCategory },
      });
    },
    [router]
  );

  const handleBackNavigation = useCallback(() => {
    triggerHapticFeedback();
    persistFeedResumeFromReels();
    const homeCategory = resolveReturnHomeCategory(
      useReelsStore.getState().resumePlayback?.feedKey,
      category,
      readHomeFeedCategory()
    );

    if (source === "Downloads") {
      if (router.canGoBack?.()) {
        router.back();
        return;
      }
      router.replace("/downloads/DownloadsScreen");
      return;
    }
    if (source === "Library" || source === "AllLibrary") {
      if (router.canGoBack?.()) {
        router.back();
        return;
      }
      router.replace("/screens/library/LibraryScreen");
      return;
    }
    if (source === "ExploreSearch") {
      if (router.canGoBack?.()) {
        router.back();
        return;
      }
      router.push("/ExploreSearch/ExploreSearch");
      return;
    }

    // Home-origin content: pop back when Home is still on the stack so the
    // category chip can restore without remounting the feed. Otherwise land
    // on Home with that chip selected (bottom tab + category rail).
    if (router.canGoBack?.()) {
      router.back();
      return;
    }
    goHomeToCategory(homeCategory);
  }, [
    router,
    source,
    category,
    triggerHapticFeedback,
    persistFeedResumeFromReels,
    goHomeToCategory,
  ]);

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
      /**
       * This used to `return` silently. The heart still animated — the button
       * plays its animation before invoking onPress — so the user saw a heart
       * punch and a count that never moved. It happens whenever the reel was
       * navigated in as a synthetic item with no real `_id`, e.g. from the
       * VideoComponent mini cards. Tell them instead of pretending.
       */
      if (!canUseBackendLikes || !contentIdForHooks) {
        Alert.alert(
          "Can't like this yet",
          "This video is still syncing. Pull to refresh and try again."
        );
        return;
      }
      await toggleLike(contentIdForHooks, activeContentType);
    } catch (e) {
      console.error("❌ Error toggling like in reels:", e);
    }
  }, [canUseBackendLikes, contentIdForHooks, activeContentType, toggleLike]);

  const handleComment = useCallback(
    (key: string) => {
      const commentContentId = contentIdForHooks || contentId || key;
      const speakerName =
        typeof currentVideo?.speaker === "string"
          ? currentVideo.speaker
          : undefined;
      showCommentModal(
        [],
        commentContentId,
        "media",
        speakerName,
        speakerName
          ? {
              userId: "",
              displayName: speakerName,
              avatar:
                typeof currentVideo?.speakerAvatar === "string"
                  ? currentVideo.speakerAvatar
                  : undefined,
            }
          : null,
        fullscreenReelsCommentAnchor()
      );
    },
    [contentId, contentIdForHooks, showCommentModal, currentVideo]
  );

  const handleSave = useCallback(
    async (key: string) => {
      try {
        const auth = await ensureAuthenticatedForInteraction({ action: "save" });
        if (!auth.ok) return;

        const libraryId = contentIdForHooks || key;
        const seed = resolveSaveSeed(libraryId, currentVideo);
        const currentlySaved = seed.initialSaved;
        const nextSaved = !currentlySaved;
        setSuccessMessage(
          nextSaved ? "Saved to library!" : "Removed from library!"
        );
        setShowSuccessCard(true);

        const libraryItem = {
          id: libraryId,
          title: currentVideo.title || title,
          speaker: currentVideo.speaker || speaker,
          timeAgo: currentVideo.timeAgo || timeAgo,
          contentType: currentVideo.contentType || "Reel",
          fileUrl: currentVideo.fileUrl || imageUrl,
          thumbnailUrl:
            currentVideo.imageUrl || currentVideo.thumbnailUrl || imageUrl,
          originalKey: key,
          createdAt: currentVideo.createdAt || new Date().toISOString(),
        };

        if (nextSaved) {
          void libraryStore.addToLibrary(libraryItem);
        } else {
          void libraryStore.removeFromLibrary(libraryId);
          void libraryStore.removeFromLibrary(key);
        }

        if (canUseBackendLikes && contentIdForHooks) {
          const result = await useInteractionStore
            .getState()
            .toggleSave(
              contentIdForHooks,
              mapContentTypeForBackend(activeContentType || "media"),
              {
                initialSaved: seed.initialSaved,
                initialSaves: seed.initialSaves,
              }
            );
          if (result?.authRequired) {
            setShowSuccessCard(false);
            if (nextSaved) {
              void libraryStore.removeFromLibrary(libraryId);
              void libraryStore.removeFromLibrary(key);
            } else {
              void libraryStore.addToLibrary(libraryItem);
            }
            return;
          }

          setSuccessMessage(
            result?.saved ? "Saved to library!" : "Removed from library!"
          );
          if (result?.saved) {
            void libraryStore.addToLibrary(libraryItem);
          } else {
            void libraryStore.removeFromLibrary(libraryId);
            void libraryStore.removeFromLibrary(key);
          }
        }
      } catch (e) {
        console.error("❌ Error handling save:", e);
        setSuccessMessage("Couldn't save — media may be unavailable");
        setShowSuccessCard(true);
      }
    },
    [
      libraryStore,
      currentVideo,
      title,
      speaker,
      timeAgo,
      imageUrl,
      canUseBackendLikes,
      contentIdForHooks,
      activeContentType,
      setSuccessMessage,
      setShowSuccessCard,
    ]
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
          const contentId = currentVideo._id || contentIdForHooks;
          if (contentId) {
            await useInteractionStore
              .getState()
              .recordShare(
                contentId,
                mapContentTypeForBackend(activeContentType || "media"),
                result.activityType || "generic"
              );
          }
        }
        setMenuVisible(false);
      } catch (e) {
        console.error("❌ Error handling share:", e);
        setMenuVisible(false);
      }
    },
    [currentVideo, imageUrl, contentIdForHooks, activeContentType, setMenuVisible]
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
    setTimeout(() => setShowReportModal(true), 300);
  }, [setMenuVisible, setShowReportModal]);

  return {
    handleBackNavigation,
    persistFeedResumeFromReels,
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
