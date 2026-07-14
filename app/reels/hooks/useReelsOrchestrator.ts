import { Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useMediaDeletion } from "../../../src/shared/hooks/useMediaDeletion";
import { useCommentModal } from "../../context/CommentModalContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useGlobalVideoStore } from "../../store/useGlobalVideoStore";
import { useContentCount, useInteractionStore, useUserInteraction } from "../../store/useInteractionStore";
import { useLibraryStore } from "../../store/useLibraryStore";
import { useMediaPlaybackStore } from "../../store/useMediaPlaybackStore";
import { useReelsStore } from "../../store/useReelsStore";
import { UserProfileCache } from "../../utils/cache/UserProfileCache";
import { useDownloadHandler } from "../../utils/downloadUtils";
import { getPersistedStats } from "../../utils/persistentStorage";
import {
    useReelsCurrentVideo,
    useReelsHandlers,
    useReelsResponsive,
    useReelsScroll,
    useReelsVideoList,
    useReelsVideoPlayback
} from "./";

/**
 * useReelsOrchestrator - The "Master Hook" for the Reels feature.
 * Consolidates all sub-hooks and logic into a single clean API.
 */
export function useReelsOrchestrator() {
    const params = useLocalSearchParams() as any;
    const router = useRouter();
    const videoRefs = useRef<Record<string, Video>>({});

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
    const globalVideoStore = useGlobalVideoStore();
    const mediaStore = useMediaPlaybackStore();
    const reelsStore = useReelsStore();
    const { user: currentUser, getFullName, getAvatarUrl } = useUserProfile();
    const { showCommentModal } = useCommentModal();
    const libraryStore = useLibraryStore();
    const { handleDownload: handleDownloadInternal, checkIfDownloaded } = useDownloadHandler();

    const toggleLike = useInteractionStore((s: any) => s.toggleLike);
    const loadContentStats = useInteractionStore((s: any) => s.loadContentStats);
    const playingVideos = globalVideoStore.playingVideos;
    const mutedVideos = globalVideoStore.mutedVideos;

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
        videoRefs: videoRefs as RefObject<Record<string, Video>>,
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
        mediaStore,
        playingVideos,
        userHasManuallyPaused,
    });

    const scroll = useReelsScroll({
        currentIndex: currentIndex_state,
        setCurrentIndex: setCurrentIndex_state,
        allVideos: parsedVideoList,
        getSpeakerName: current.getSpeakerName,
        userHasManuallyPaused,
        mediaStore,
        globalVideoStore,
    });

    const toggleVideoPlay = useCallback(() => {
        const isPlaying = playingVideos[current.modalKey] ?? false;
        mediaStore.updateLastAccessed(current.modalKey);
        if (isPlaying) {
            globalVideoStore.pauseVideo(current.modalKey);
            setUserHasManuallyPaused(true);
            setShowPauseOverlay(true);
            setTimeout(() => setShowPauseOverlay(false), 1000);
        } else {
            globalVideoStore.playVideoGlobally(current.modalKey);
            setUserHasManuallyPaused(false);
            setShowPauseOverlay(false);
        }
    }, [playingVideos, current.modalKey, mediaStore, globalVideoStore]);

    const allVideos = parsedVideoList.length > 0 ? parsedVideoList : [current.currentVideo];

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
        mediaStore,
        reelsStore,
        currentUser,
        getAvatarUrl,
        libraryStore,
        playingVideos,
        mutedVideos,

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
        triggerHapticFeedback,
        toggleVideoPlay,
        checkIfDownloaded,
        handleDownload,

        // Data
        allVideos,
    };
}
