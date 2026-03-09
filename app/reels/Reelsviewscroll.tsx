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
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, StatusBar, View, ViewToken } from "react-native";

import { useMediaDeletion } from "../../src/shared/hooks/useMediaDeletion";
import ErrorBoundary from "../components/ErrorBoundary";
import { useCommentModal } from "../context/CommentModalContext";
import { useUserProfile } from "../hooks/useUserProfile";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import {
  useContentCount,
  useInteractionStore,
  useUserInteraction
} from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaPlaybackStore } from "../store/useMediaPlaybackStore";
import { useReelsStore } from "../store/useReelsStore";
import { UserProfileCache } from "../utils/cache/UserProfileCache";
import { useDownloadHandler } from "../utils/downloadUtils";
import { navigateMainTab } from "../utils/navigation";
import { getPersistedStats } from "../utils/persistentStorage";
import { ReelsErrorView } from "./components/ReelsErrorView";
import { ReelsModals } from "./components/ReelsModals";
import { ReelsVideoItem } from "./components/ReelsVideoItem";
import {
  useReelsCurrentVideo,
  useReelsHandlers,
  useReelsResponsive,
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
  const flatListRef = useRef<FlatList>(null);

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
    toggleLike: async (cid, ct) => {
      await toggleLike(cid, ct);
    },
    showCommentModal: (comments, cid, type, speaker) => {
      showCommentModal(comments, cid, type as any, speaker);
    },
    libraryStore,
    handleDownload: async (item) => {
      await handleDownload(item);
    },
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

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 100,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const item = viewableItems[0];
        const newIndex = item.index ?? 0;
        if (newIndex !== currentIndex_state) {
          setCurrentIndex_state(newIndex);

          const videoData = allVideos[newIndex];
          if (videoData) {
            const speakerName = getSpeakerName(videoData, "Creator");
            const videoKey = `reel-${videoData._id || videoData.id || newIndex}-${videoData.title}-${speakerName}`;

            mediaStore.updateLastAccessed(videoKey);
            if (!userHasManuallyPaused) {
              globalVideoStore.playVideoGlobally(videoKey);
            }
          }
        }
      }
    },
    [currentIndex_state, allVideos, getSpeakerName, userHasManuallyPaused, mediaStore, globalVideoStore]
  );

  useEffect(() => {
    if (flatListRef.current && parsedVideoList.length > 0) {
      // Small delay to ensure FlatList is ready
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: currentVideoIndex,
          animated: false,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [parsedVideoList.length]);

  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isActive = index === currentIndex_state;
    const speakerName = getSpeakerName(item, "unknown");
    const videoKey = `reel-${item._id || item.id || index}-${item.title}-${speakerName}`;

    return (
      <View
        style={{
          height: screenHeight,
          width: "100%",
          backgroundColor: "#000000",
        }}
      >
        {renderVideoItem(item, index, isActive, videoKey)}
      </View>
    );
  };

  return (
    <ErrorBoundary>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <FlatList
        ref={flatListRef}
        data={allVideos}
        renderItem={renderItem}
        keyExtractor={(item, index) => {
          const speakerName = getSpeakerName(item, "unknown");
          return `reel-${item._id || item.id || index}-${item.title}-${speakerName}`;
        }}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
        removeClippedSubviews={true}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        decelerationRate="fast"
        snapToInterval={screenHeight}
        snapToAlignment="start"
      />

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
