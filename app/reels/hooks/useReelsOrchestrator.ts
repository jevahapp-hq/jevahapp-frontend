import type { VideoPlayer } from "expo-video";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMediaDeletion } from "../../../src/shared/hooks/useMediaDeletion";
import {
  refreshFeedAfterDelete,
  removeMediaFromFeedCaches,
} from "../../../src/shared/utils/removeMediaFromFeedCaches";
import { applyMediaDescriptionToCaches } from "../../../src/shared/utils/applyMediaDescriptionToCaches";
import { useCommentModal } from "../../context/CommentModalContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { useInteractionStore } from "@/store/useInteractionStore";
import { useContentLikeState } from "../../../src/shared/hooks/useContentLikeState";
import { useHydrateContentStats } from "../../../src/shared/hooks/useHydrateContentStats";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useReelsStore } from "@/store/useReelsStore";
import { UserProfileCache } from "../../utils/cache/UserProfileCache";
import { useDownloadHandler } from "../../utils/downloadUtils";
import { getPersistedStats } from "../../utils/persistentStorage";
import { useEngagementSocket } from "../../hooks/useEngagementSocket";
import { useReelsAdjacentPrefetch } from "./useReelsAdjacentPrefetch";
import { useReelsCurrentVideo } from "./useReelsCurrentVideo";
import { useReelsDescriptionEdit } from "./useReelsDescriptionEdit";
import { useReelsHandlers } from "./useReelsHandlers";
import { useReelsResponsive } from "./useReelsResponsive";
import { useReelsScroll } from "./useReelsScroll";
import { useReelsVideoList } from "./useReelsVideoList";
import { useReelsVideoPlayback } from "./useReelsVideoPlayback";

/**
 * useReelsOrchestrator - The "Master Hook" for the Reels feature.
 * Consolidates all sub-hooks and logic into a single clean API.
 */
export function useReelsOrchestrator() {
    const params = useLocalSearchParams() as any;
    const router = useRouter();
    const queryClient = useQueryClient();
    const videoRefs = useRef<Record<string, VideoPlayer>>({});

    // State
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [videoStats, setVideoStats] = useState<Record<string, any>>({});
    const [videoDuration, setVideoDuration] = useState(0);
    const [videoPosition, setVideoPosition] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [showPauseOverlay, setShowPauseOverlay] = useState(false);
    const [userHasManuallyPaused, setUserHasManuallyPaused] = useState(false);
    const [activeTab, setActiveTab] = useState("Home");
    const [menuVisible, setMenuVisible] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    // Stores & Context
    const pauseVideo = useGlobalVideoStore((s) => s.pauseVideo);
    const playVideoGlobally = useGlobalVideoStore((s) => s.playVideoGlobally);
    const pauseAllVideos = useGlobalVideoStore((s) => s.pauseAllVideos);
    const toggleVideoMute = useGlobalVideoStore((s) => s.toggleVideoMute);
    const setVideoProgress = useGlobalVideoStore((s) => s.setVideoProgress);
    const globalVideoStore = useMemo(
        () => ({
            pauseVideo,
            playVideoGlobally,
            pauseAllVideos,
            toggleVideoMute,
            setVideoProgress,
        }),
        [pauseVideo, playVideoGlobally, pauseAllVideos, toggleVideoMute, setVideoProgress]
    );
    const reelsStore = useReelsStore();
    const { user: currentUser, getFullName, getAvatarUrl } = useUserProfile();
    const { showCommentModal } = useCommentModal();
    const libraryStore = useLibraryStore();
    const { handleDownload: handleDownloadInternal, checkIfDownloaded } = useDownloadHandler();

    const toggleLike = useInteractionStore((s: any) => s.toggleLike);
    const loadContentStats = useInteractionStore((s: any) => s.loadContentStats);

    // Type-safe download wrapper
    const handleDownload = useCallback(async (item: any) => {
        await handleDownloadInternal(item);
    }, [handleDownloadInternal]);

    // Initialize
    useEffect(() => {
        if (currentUser) {
            const userId = currentUser._id || currentUser.id;
            if (userId) {
                UserProfileCache.cacheUserProfile(userId, {
                    firstName: currentUser.firstName || "",
                    lastName: currentUser.lastName || "",
                    avatar: currentUser.avatar || currentUser.avatarUpload || "",
                    email: currentUser.email,
                });
            }
        }
    }, [currentUser]);

    useEffect(() => {
        const init = async () => {
            try {
                const stats = await getPersistedStats();
                setVideoStats(stats);
            } catch (e) {
                console.error("❌ useReelsOrchestrator: Failed to load persisted data:", e);
            }
        };
        init();
    }, [params.title]);

    // Sub-hooks
    const responsive = useReelsResponsive();

    const parsedVideoList = useReelsVideoList({
        reelsStoreVideoList: reelsStore.videoList,
        videoListParam: params.videoList,
        reelsStoreSetVideoList: reelsStore.setVideoList,
    });

    const reelsIndex = reelsStore.currentIndex ?? parseInt(params.currentIndex);
    const currentVideoIndex = reelsIndex || 0;

    const [currentIndex_state, setCurrentIndex_state] = useState(currentVideoIndex);

    const current = useReelsCurrentVideo({
        parsedVideoList,
        currentIndex: currentIndex_state,
        fallbackParams: params,
        currentUser,
        getFullName,
    });

    // Same read path as the feed card — see useContentLikeState. Reels used to
    // read the store alone, which is why a like made in the feed showed as
    // unliked here after a cold start or a metadata refetch.
    const activeLike = useContentLikeState(
        current.contentIdForHooks,
        current.currentVideo as any
    );
    const activeIsLiked = activeLike.liked;
    const activeLikesCount = activeLike.likeCount;

    /** Live metadata edits from the author's other devices. */
    const handleMediaUpdated = useCallback(
        (payload: { contentId?: string; mediaId?: string; description?: string }) => {
            const id = String(payload?.contentId || payload?.mediaId || "").trim();
            if (!id || typeof payload?.description !== "string") return;
            applyMediaDescriptionToCaches(queryClient, id, payload.description);
        },
        [queryClient]
    );

    useEngagementSocket({
      focusedContentId: current.canUseBackendLikes
        ? current.contentIdForHooks
        : null,
      focusedContentType: current.activeContentType || "media",
      onMediaUpdated: handleMediaUpdated,
    });

    // Guarded hydration, matching the feed. The previous unconditional
    // `loadContentStats` re-fetched on every mount and let a server
    // `hasLiked: false` overwrite a local like.
    useHydrateContentStats(
        current.canUseBackendLikes ? current.contentIdForHooks : "",
        "media"
    );

    const {
        isOwner,
        showDeleteModal,
        openDeleteModal,
        closeDeleteModal,
        handleDeleteConfirm: handleDeleteConfirmInternal,
    } = useMediaDeletion({
        mediaItem: current.currentVideo,
        isModalVisible: menuVisible,
    });

    const descriptionEdit = useReelsDescriptionEdit({
        mediaId: String(current.currentVideo?._id || ""),
        currentDescription: String(current.currentVideo?.description || ""),
        isOwner,
    });

    /** After API delete succeeds — remove instantly from Reels + feed caches (no second delete call). */
    const handleDeleteSuccessUi = useCallback(() => {
        const id = String(current.currentVideo?._id || "").trim();
        setMenuVisible(false);
        closeDeleteModal();
        if (id) {
            reelsStore.removeVideoById(id);
            removeMediaFromFeedCaches(queryClient, id);
            refreshFeedAfterDelete(queryClient);
        }
        const remaining = useReelsStore.getState().videoList;
        const nextIndex = useReelsStore.getState().currentIndex;
        setCurrentIndex_state(nextIndex);
        if (remaining.length === 0) {
            router.back();
        }
    }, [
        current.currentVideo?._id,
        closeDeleteModal,
        queryClient,
        reelsStore,
        router,
    ]);

    // Stable identity: this is passed down into the player's listener effect,
    // and a fresh function each render re-subscribed the native listeners.
    const triggerHapticFeedback = useCallback(() => {
        // Basic trigger logic if needed
    }, []);

    const handlers = useReelsHandlers({
        router,
        contentId: current.contentId,
        contentIdForHooks: current.contentIdForHooks,
        canUseBackendLikes: current.canUseBackendLikes,
        activeContentType: current.activeContentType,
        currentVideo: current.currentVideo,
        modalKey: current.modalKey,
        menuVisible,
        videoStats,
        setVideoStats,
        setMenuVisible,
        setShowDetailsModal,
        setShowReportModal,
        source: params.source,
        category: params.category,
        title: params.title,
        speaker: params.speaker,
        timeAgo: params.timeAgo,
        imageUrl: params.imageUrl,
        sheared: params.sheared,
        // Seed the optimistic flip with the truth. Without this the store
        // assumed `liked: false, likes: 0`, so the first tap in Reels sent a
        // *like* for content the user had already liked in the feed.
        toggleLike: async (cid, ct) =>
            await toggleLike(cid, ct, activeLike.toggleSeed),
        showCommentModal: (comments, cid, type, speaker) => showCommentModal(comments, cid, type as any, speaker),
        libraryStore,
        handleDownload,
        openDeleteModal,
        handleDeleteConfirmInternal,
        triggerHapticFeedback,
    });

    const playback = useReelsVideoPlayback({
        videoRefs: videoRefs as RefObject<Record<string, VideoPlayer>>,
        videoDuration,
        modalKey: current.modalKey,
        setVideoDuration,
        setVideoPosition,
        setShowPauseOverlay,
        setUserHasManuallyPaused,
        setMenuVisible,
        screenWidth: responsive.screenWidth,
        setIsDragging,
        globalVideoStore,
        userHasManuallyPaused,
    });

    const scroll = useReelsScroll({
        currentIndex: currentIndex_state,
        setCurrentIndex: setCurrentIndex_state,
        allVideos: parsedVideoList,
        getSpeakerName: current.getSpeakerName,
        userHasManuallyPaused,
        globalVideoStore,
    });

    const toggleVideoPlay = useCallback(() => {
        const key = current.modalKey;
        const isPlaying = useGlobalVideoStore.getState().playingVideos[key] ?? false;
        if (isPlaying) {
            pauseVideo(key);
            setUserHasManuallyPaused(true);
            setShowPauseOverlay(true);
            setTimeout(() => setShowPauseOverlay(false), 1000);
        } else {
            playVideoGlobally(key);
            setUserHasManuallyPaused(false);
            setShowPauseOverlay(false);
        }
    }, [current.modalKey, pauseVideo, playVideoGlobally]);

    // Memoized: a fresh array literal here re-created the FlatList `data` and
    // the prefetch dep on every render, turning any single state tick into a
    // full-list re-render.
    const allVideos = useMemo(
        () =>
            parsedVideoList.length > 0
                ? parsedVideoList
                : current.currentVideo
                  ? [current.currentVideo]
                  : [],
        [parsedVideoList, current.currentVideo]
    );

    useReelsAdjacentPrefetch({
        currentIndex: currentIndex_state,
        videos: allVideos,
    });

    return {
        // State
        params,
        router,
        videoRefs,
        currentIndex_state,
        setCurrentIndex_state,
        hasError,
        setHasError,
        errorMessage,
        setErrorMessage,
        videoStats,
        videoDuration,
        videoPosition,
        isDragging,
        setIsDragging,
        showPauseOverlay,
        userHasManuallyPaused,
        activeTab,
        setActiveTab,
        menuVisible,
        setMenuVisible,
        showDetailsModal,
        setShowDetailsModal,
        showReportModal,
        setShowReportModal,
        setVideoDuration, // Added missing
        setVideoPosition, // Added missing

        // Stores/Context
        globalVideoStore,
        reelsStore,
        currentUser,
        getAvatarUrl,
        libraryStore,

        // Orchestrated Hooks
        responsive,
        current,
        handlers,
        playback,
        scroll,

        // Interactions
        activeIsLiked,
        activeLikesCount,
        isOwner,
        showDeleteModal,
        closeDeleteModal,
        handleDeleteSuccessUi,
        triggerHapticFeedback,
        toggleVideoPlay,
        checkIfDownloaded,
        handleDownload,
        descriptionEdit,

        // Data
        allVideos,
    };
}
