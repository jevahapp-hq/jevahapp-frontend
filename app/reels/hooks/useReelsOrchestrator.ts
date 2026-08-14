import type { VideoPlayer } from "expo-video";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMediaDeletion } from "../../../src/shared/hooks/useMediaDeletion";
import {
  refreshFeedAfterDelete,
  removeMediaFromFeedCaches,
} from "../../../src/shared/utils/removeMediaFromFeedCaches";
import { useCommentModal } from "../../context/CommentModalContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useGlobalVideoStore } from "../../store/useGlobalVideoStore";
import { useInteractionStore, useContentCount, useUserInteraction } from "../../store/useInteractionStore";
import { useLibraryStore } from "../../store/useLibraryStore";
import { useReelsStore } from "../../store/useReelsStore";
import { UserProfileCache } from "../../utils/cache/UserProfileCache";
import { useDownloadHandler } from "../../utils/downloadUtils";
import { getPersistedStats } from "../../utils/persistentStorage";
import { useEngagementSocket } from "../../hooks/useEngagementSocket";
import {
    useReelsCurrentVideo,
    useReelsHandlers,
    useReelsResponsive,
    useReelsScroll,
    useReelsVideoList,
    useReelsVideoPlayback
} from "./";
import { useReelsAdjacentPrefetch } from "./useReelsAdjacentPrefetch";

/**
 * useReelsOrchestrator - The "Master Hook" for the Reels feature.
 * Consolidates all sub-hooks and logic into a single clean API.
 */
export function useReelsOrchestrator() {
    const params = useLocalSearchParams() as any;
    const router = useRouter();
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

    const activeIsLiked = useUserInteraction(current.contentIdForHooks, "liked");
    const activeLikesCount = useContentCount(current.contentIdForHooks, "likes");

    useEngagementSocket({
      focusedContentId: current.canUseBackendLikes
        ? current.contentIdForHooks
        : null,
      focusedContentType: current.activeContentType || "media",
    });

    useEffect(() => {
        if (!current.canUseBackendLikes) return;
        loadContentStats(current.contentIdForHooks, current.activeContentType);
    }, [current.canUseBackendLikes, loadContentStats, current.contentIdForHooks, current.activeContentType]);

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

    const queryClient = useQueryClient();

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

    const triggerHapticFeedback = () => {
        // Basic trigger logic if needed
    };

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
        toggleLike: async (cid, ct) => await toggleLike(cid, ct),
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

    const allVideos = parsedVideoList.length > 0 ? parsedVideoList : [current.currentVideo];

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

        // Data
        allVideos,
    };
}
