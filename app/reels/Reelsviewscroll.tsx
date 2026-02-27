/**
 * Reelsviewscroll - Main Reels screen
 * Orchestrates reels playback. Logic is split across:
 * - hooks/useReelsCurrentVideo: video metadata, keys, speaker resolution
 * - hooks/useReelsHandlers: like, comment, share, save, navigation
 * - hooks/useReelsVideoPlayback: seek, formatTime, playback effects
 * - components/ReelsModals: modals + header + bottom nav
 */
import { Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StatusBar, Text, View } from "react-native";

import { useMediaDeletion } from "../../src/shared/hooks/useMediaDeletion";
import ErrorBoundary from "../components/ErrorBoundary";
import { useCommentModal } from "../context/CommentModalContext";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import {
  useContentCount,
  useContentStats,
  useInteractionStore,
  useUserInteraction,
} from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaPlaybackStore } from "../store/useMediaPlaybackStore";
import { useReelsStore } from "../store/useReelsStore";
import { useDownloadHandler } from "../utils/downloadUtils";
import { navigateMainTab } from "../utils/navigation";
import { getPersistedStats } from "../utils/persistentStorage";
import { useUserProfile } from "../hooks/useUserProfile";
import { UserProfileCache } from "../utils/cache/UserProfileCache";
import { ReelsErrorView } from "./components/ReelsErrorView";
import { ReelsModals } from "./components/ReelsModals";
import { ReelsVideoItem } from "./components/ReelsVideoItem";
import {
  useReelsCurrentVideo,
  useReelsHandlers,
  useReelsResponsive,
  useReelsScroll,
  useReelsVideoList,
  useReelsVideoPlayback,
} from "./hooks";

type Params = {
  title: string;
  speaker: string;
  timeAgo: string;
  views: string;
  sheared: string;
  saved: string;
  favorite: string;
  imageUrl: string;
  speakerAvatar: string;
  isLive?: string;
  category?: string;
  videoList?: string;
  currentIndex?: string;
  source?: string;
};

export default function Reelsviewscroll() {
  const params = useLocalSearchParams() as Params;
  const {
    title,
    speaker,
    timeAgo,
    views,
    sheared,
    saved,
    favorite,
    imageUrl,
    speakerAvatar,
    category,
    currentIndex = "0",
    source,
  } = params;
  const router = useRouter();

  const videoRefs = useRef<Record<string, Video>>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [videoStats, setVideoStats] = useState<Record<string, any>>({});
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [reelsProgressBarWidth, setReelsProgressBarWidth] = useState(0);
  const [showPauseOverlay, setShowPauseOverlay] = useState(false);
  const [userHasManuallyPaused, setUserHasManuallyPaused] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const globalVideoStore = useGlobalVideoStore();
  const mediaStore = useMediaPlaybackStore();
  const reelsStore = useReelsStore();
  const { user: currentUser, getFullName, getAvatarUrl } = useUserProfile();
  const { showCommentModal } = useCommentModal();
  const libraryStore = useLibraryStore();
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const toggleLike = useInteractionStore((s) => s.toggleLike);
  const loadContentStats = useInteractionStore((s) => s.loadContentStats);

  const playingVideos = globalVideoStore.playingVideos;
  const mutedVideos = globalVideoStore.mutedVideos;

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

  const parsedVideoList = useReelsVideoList({
    reelsStoreVideoList: reelsStore.videoList,
    videoListParam: params.videoList,
    reelsStoreSetVideoList: reelsStore.setVideoList,
  });

  const currentVideoIndex =
    reelsStore.currentIndex !== undefined && reelsStore.currentIndex !== null
      ? reelsStore.currentIndex
      : parseInt(currentIndex) || 0;
  const [currentIndex_state, setCurrentIndex_state] = useState(currentVideoIndex);

  const {
    currentVideo,
    modalKey,
    contentId,
    contentIdForHooks,
    canUseBackendLikes,
    activeContentType,
    getSpeakerName,
    video,
  } = useReelsCurrentVideo({
    parsedVideoList,
    currentIndex: currentIndex_state,
    fallbackParams: {
      title,
      speaker,
      timeAgo,
      views,
      sheared,
      saved,
      favorite,
      imageUrl,
      speakerAvatar,
    },
    currentUser,
    getFullName,
  });

  const activeIsLiked = useUserInteraction(contentIdForHooks, "liked");
  const activeLikesCount = useContentCount(contentIdForHooks, "likes");

  useEffect(() => {
    if (!canUseBackendLikes) return;
    loadContentStats(contentIdForHooks, activeContentType);
  }, [canUseBackendLikes, loadContentStats, contentIdForHooks, activeContentType]);

  const {
    isOwner,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteConfirm: handleDeleteConfirmInternal,
  } = useMediaDeletion({
    mediaItem: currentVideo,
    isModalVisible: menuVisible,
  });

  const {
    screenHeight,
    screenWidth,
    isIOS,
    getResponsiveSize,
    getResponsiveSpacing,
    getResponsiveFontSize,
    getTouchTargetSize,
  } = useReelsResponsive();

  const hasList = Array.isArray(reelsStore.videoList) && reelsStore.videoList.length > 0;
  useEffect(() => {
    if (!hasList) {
      reelsStore.setVideoList([
        {
          _id: "fallback",
          title: "Video",
          speaker: "",
          timeAgo: "",
          views: 0,
          sheared: 0,
          saved: 0,
          favorite: 0,
          fileUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          imageUrl: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217",
          speakerAvatar: "",
          contentType: "video",
          description: "",
          createdAt: new Date().toISOString(),
          uploadedBy: "",
        } as any,
      ]);
      reelsStore.setCurrentIndex(0);
    }
  }, [hasList]);

  const triggerHapticFeedback = () => {
    if (isIOS) {
      // expo-haptics can be used here
    }
  };

  const handlers = useReelsHandlers({
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
  });

  const { seekToPosition, formatTime, toggleMute } = useReelsVideoPlayback({
    videoRefs: videoRefs as React.RefObject<Record<string, Video>>,
    videoDuration,
    modalKey,
    setVideoDuration,
    setVideoPosition,
    setShowPauseOverlay,
    setUserHasManuallyPaused,
    setMenuVisible,
    screenWidth,
    reelsProgressBarWidth,
    setIsDragging,
    globalVideoStore,
    mediaStore,
    playingVideos,
    userHasManuallyPaused,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const stats = await getPersistedStats();
        setVideoStats(stats);
      } catch (e) {
        console.error("❌ ReelsView: Failed to load persisted data:", e);
      }
    };
    init();
  }, [modalKey, title]);

  const toggleVideoPlay = () => {
    const isPlaying = playingVideos[modalKey] ?? false;
    mediaStore.updateLastAccessed(modalKey);
    if (isPlaying) {
      globalVideoStore.pauseVideo(modalKey);
      setUserHasManuallyPaused(true);
    } else {
      globalVideoStore.playVideoGlobally(modalKey);
      setUserHasManuallyPaused(false);
    }
    if (isPlaying) {
      setShowPauseOverlay(true);
      setTimeout(() => setShowPauseOverlay(false), 1000);
    } else {
      setShowPauseOverlay(false);
    }
  };

  if (hasError) {
    return (
      <ReelsErrorView
        errorMessage={errorMessage}
        onRetry={() => {
          setHasError(false);
          setErrorMessage("");
        }}
        onGoBack={() => router.back()}
      />
    );
  }

  const renderVideoItem = (
    videoData: any,
    index: number,
    isActive = false,
    passedVideoKey?: string
  ) => {
    const enriched = UserProfileCache.enrichContentWithUserData(videoData);
    const speakerName = getSpeakerName(enriched, "Creator");
    const videoKey =
      passedVideoKey ||
      `reel-${enriched._id || enriched.id || index}-${enriched.title}-${speakerName}`;
    return (
      <ReelsVideoItem
        videoData={videoData}
        index={index}
        isActive={isActive}
        passedVideoKey={passedVideoKey}
        videoRefs={videoRefs}
        screenHeight={screenHeight}
        screenWidth={screenWidth}
        isIOS={isIOS}
        currentIndex_state={currentIndex_state}
        playingVideos={playingVideos}
        mutedVideos={mutedVideos}
        videoDuration={videoDuration}
        videoPosition={videoPosition}
        isDragging={isDragging}
        reelsProgressBarWidth={reelsProgressBarWidth}
        showPauseOverlay={showPauseOverlay}
        userHasManuallyPaused={userHasManuallyPaused}
        modalKey={modalKey}
        currentVideo={currentVideo}
        video={video}
        enrichedVideoData={enriched}
        activeIsLiked={activeIsLiked}
        activeLikesCount={activeLikesCount}
        canUseBackendLikes={canUseBackendLikes}
        videoStats={videoStats}
        libraryStore={libraryStore}
        getSpeakerName={getSpeakerName}
        getResponsiveSize={getResponsiveSize}
        getResponsiveSpacing={getResponsiveSpacing}
        getResponsiveFontSize={getResponsiveFontSize}
        getTouchTargetSize={getTouchTargetSize}
        onToggleVideoPlay={toggleVideoPlay}
        onSeek={seekToPosition}
        onToggleMute={toggleMute}
        onLike={handlers.handleLike}
        onComment={handlers.handleComment}
        onSave={handlers.handleSave}
        onShare={handlers.handleShare}
        onViewDetails={handlers.handleViewDetails}
        onDownload={handlers.handleDownloadAction}
        onDelete={handlers.openDeleteModal}
        onReport={handlers.handleReport}
        onMenuToggle={() => setMenuVisible((v) => !v)}
        onMenuClose={() => setMenuVisible(false)}
        setIsDragging={setIsDragging}
        setReelsProgressBarWidth={setReelsProgressBarWidth}
        setVideoDuration={setVideoDuration}
        setVideoPosition={setVideoPosition}
        triggerHapticFeedback={triggerHapticFeedback}
        formatTime={formatTime}
        globalVideoStore={globalVideoStore}
        mediaStore={mediaStore}
        source={source}
        menuVisible={menuVisible}
        isOwner={isOwner}
        checkIfDownloaded={checkIfDownloaded}
        currentUser={currentUser}
        getAvatarUrl={getAvatarUrl}
      />
    );
  };

  const allVideos = parsedVideoList.length > 0 ? parsedVideoList : [currentVideo];

  const {
    handleScroll,
    handleScrollEnd,
    handleScrollBeginDrag,
    setScrollStartIndex,
  } = useReelsScroll({
    screenHeight,
    scrollViewRef,
    getSpeakerName,
    setCurrentIndex: setCurrentIndex_state,
    currentIndex: currentIndex_state,
    allVideos,
    userHasManuallyPaused,
    mediaStore,
    globalVideoStore,
  });

  useEffect(() => {
    if (scrollViewRef.current && parsedVideoList.length > 0) {
      const initialOffset = currentIndex_state * screenHeight;
      setScrollStartIndex(currentIndex_state);
      globalVideoStore.pauseAllVideos();
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: initialOffset, animated: false });
      }, 50);
      setTimeout(() => {
        const initialVideo = allVideos[currentIndex_state];
        if (!initialVideo) return;
        const speakerName = getSpeakerName(initialVideo, "Creator");
        const initialKey = `reel-${initialVideo._id || initialVideo.id || currentIndex_state}-${initialVideo.title}-${speakerName}`;
        Object.keys(videoRefs.current).forEach((key) => {
          if (key !== initialKey && videoRefs.current[key]) {
            try {
              videoRefs.current[key].pauseAsync().catch(() => {});
              globalVideoStore.unregisterVideoPlayer(key);
            } catch {}
          }
        });
        const videoRef = videoRefs.current[initialKey];
        if (videoRef) {
          globalVideoStore.registerVideoPlayer(initialKey, {
            pause: async () => {
              try {
                await videoRef.pauseAsync();
                globalVideoStore.setOverlayVisible(initialKey, true);
              } catch (err) {
                console.warn(`Failed to pause ${initialKey}:`, err);
              }
            },
            showOverlay: () => globalVideoStore.setOverlayVisible(initialKey, true),
            key: initialKey,
          });
        }
        globalVideoStore.playVideoGlobally(initialKey);
        videoRef?.playAsync().catch(() => {});
      }, 200);
    } else {
      console.warn("⚠️ Cannot initialize scroll - no videos or scrollViewRef");
    }
  }, [parsedVideoList.length, currentIndex_state, setScrollStartIndex]);

  return (
    <ErrorBoundary>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={(e) => handleScrollEnd(e)}
        onMomentumScrollEnd={(e) => handleScrollEnd(e)}
        scrollEventThrottle={16}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="normal"
        bounces={isIOS}
        scrollEnabled
        nestedScrollEnabled={false}
        contentContainerStyle={{ height: screenHeight * allVideos.length }}
      >
        {allVideos.map((videoData: any, index: number) => {
          try {
            const isActive = index === currentIndex_state;
            const speakerName = getSpeakerName(videoData, "unknown");
            const videoKey = `reel-${videoData._id || videoData.id || index}-${videoData.title}-${speakerName}`;
            return (
              <View
                key={videoKey}
                style={{
                  height: screenHeight,
                  width: "100%",
                  backgroundColor: "#000000",
                  zIndex: isActive ? 10 : 0,
                }}
              >
                {renderVideoItem(videoData, index, isActive, videoKey)}
              </View>
            );
          } catch (error) {
            console.error("❌ Error rendering video in map:", error);
            return (
              <View
                key={`error-${index}`}
                style={{
                  height: screenHeight,
                  width: "100%",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16 }}>Failed to load video</Text>
              </View>
            );
          }
        })}
      </ScrollView>

      <ReelsModals
        currentVideo={currentVideo}
        title={title}
        isIOS={isIOS}
        activeTab={activeTab}
        showDeleteModal={showDeleteModal}
        showReportModal={showReportModal}
        showDetailsModal={showDetailsModal}
        onBackPress={handlers.handleBackNavigation}
        onTabChange={(tab) => {
          setActiveTab(tab);
          triggerHapticFeedback();
          navigateMainTab(tab as any);
        }}
        onCloseDelete={closeDeleteModal}
        onDeleteSuccess={handlers.handleDeleteConfirm}
        onCloseReport={() => setShowReportModal(false)}
        onCloseDetails={() => setShowDetailsModal(false)}
        getResponsiveSpacing={getResponsiveSpacing}
        getResponsiveSize={getResponsiveSize}
        getTouchTargetSize={getTouchTargetSize}
      />
    </ErrorBoundary>
  );
}
