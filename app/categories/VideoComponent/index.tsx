/**
 * VideoComponent - Modular Video Browse Screen
 * Uses extracted hooks and components for maintainability
 */

import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import VideoCard from "../../../src/features/media/components/VideoCard";
import { VideoCardSkeleton } from "../../../src/shared/components/Skeleton";
import SuccessCard from "../../components/SuccessCard";
import { useCommentModal } from "../../context/CommentModalContext";
import { useDownloadStore } from "../../store/useDownloadStore";
import { useGlobalMediaStore } from "../../store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../../store/useGlobalVideoStore";
import { useInteractionStore } from "../../store/useInteractionStore";
import { useLibraryStore } from "../../store/useLibraryStore";
import { useMediaStore } from "../../store/useUploadStore";
import {
  convertToDownloadableItem,
  useDownloadHandler,
} from "../../utils/downloadUtils";
import { getPersistedStats } from "../../utils/persistentStorage";
import { getUserAvatarFromContent, getUserDisplayNameFromContent } from "../../utils/userValidation";
import { VideoComponentMiniCards } from "./components/VideoComponentMiniCards";
import {
  useVideoComponentData,
  useVideoComponentHandlers,
  useVideoComponentPersisted,
  useVideoComponentScroll,
} from "./hooks";
import { VideoCardData } from "./types";
import { getVideoKey } from "./utils";

export default function VideoComponent() {
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();

  const { loadDownloadedItems } = useDownloadStore();
  const mediaStore = useMediaStore();
  const globalVideoStore = useGlobalVideoStore();
  const globalMediaStore = useGlobalMediaStore();
  const libraryStore = useLibraryStore();
  const contentStats = useInteractionStore((s) => s.contentStats);
  const loadBatchContentStats = useInteractionStore((s) => s.loadBatchContentStats);
  const { comments } = useInteractionStore();
  const { showCommentModal } = useCommentModal();

  const scrollViewRef = useRef<ScrollView>(null);
  const videoRefs = useRef<Record<string, any>>({});
  const videoLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const lastScrollYRef = useRef<number>(0);
  const miniCardRefs = useRef<Record<string, any>>({});

  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [pvModalIndex, setPvModalIndex] = useState<number | null>(null);
  const [trendingModalIndex, setTrendingModalIndex] = useState<number | null>(null);
  const [recommendedModalIndex, setRecommendedModalIndex] = useState<number | null>(null);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showOverlayMini, setShowOverlayMini] = useState<Record<string, boolean>>({});
  const [miniCardPlaying, setMiniCardPlaying] = useState<Record<string, boolean>>({});
  const [miniCardHasPlayed, setMiniCardHasPlayed] = useState<Record<string, boolean>>({});
  const [miniCardHasCompleted, setMiniCardHasCompleted] = useState<Record<string, boolean>>({});
  const [hasPlayed, setHasPlayed] = useState<Record<string, boolean>>({});
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});

  const uploadedVideos = useMemo(
    () =>
      mediaStore.mediaList.filter((item: any) => {
        const t = (item?.type || item?.contentType || "").toString().toLowerCase();
        return t === "videos" || t === "video" || t === "sermon" || t === "sermons";
      }),
    [mediaStore.mediaList]
  );

  useEffect(() => {
    const ids = uploadedVideos.map((v: any, index: number) => v._id || `video-${index}`).filter(Boolean);
    if (ids.length > 0) loadBatchContentStats(ids as string[]);
  }, [uploadedVideos.length, loadBatchContentStats]);

  const persisted = useVideoComponentPersisted({
    uploadedVideos,
    loadDownloadedItems,
    libraryStore,
    globalVideoStore,
  });

  const {
    videoStats,
    setVideoStats,
    previouslyViewedState,
    miniCardViews,
    setMiniCardViews,
    userFavorites,
    setUserFavorites,
    globalFavoriteCounts,
    setGlobalFavoriteCounts,
    videoVolume,
  } = persisted;

  const data = useVideoComponentData({
    uploadedVideos,
    videoStats,
    libraryStore,
    contentStats,
    previouslyViewedState,
    userFavorites,
  });

  const {
    trendingItems,
    enhancedRecommendedForYou,
    firstExploreVideos,
    middleExploreVideos,
    remainingExploreVideos,
  } = data;

  const scroll = useVideoComponentScroll({
    videoLayoutsRef,
    lastScrollYRef,
    isAutoPlayEnabled: globalVideoStore.isAutoPlayEnabled,
    globalVideoStore,
    uploadedVideos,
  });

  const handlers = useVideoComponentHandlers({
    videoStats,
    setVideoStats,
    previouslyViewedState,
    setPreviouslyViewedState: persisted.setPreviouslyViewedState,
    setModalVisible,
    setPvModalIndex,
    setTrendingModalIndex,
    setRecommendedModalIndex,
    setShowSuccessCard,
    setSuccessMessage,
    userFavorites,
    setUserFavorites,
    globalFavoriteCounts,
    setGlobalFavoriteCounts,
    libraryStore,
    globalVideoStore,
    globalMediaStore,
    showCommentModal,
    comments,
    handleDownload,
    checkIfDownloaded,
    loadDownloadedItems,
    miniCardPlaying,
    miniCardHasCompleted,
    setMiniCardPlaying,
    setShowOverlayMini,
    miniCardRefs,
    hasPlayed,
    setHasPlayed,
  });

  const {
    closeAllMenus,
    togglePlay,
    toggleMuteVideo,
    handleShare,
    handleSave,
    handleLike,
    handleComment,
    handleVideoTapWrapper,
    handleMiniCardPlay,
    handleVideoReload,
    getTimeAgo,
    convertToMediaItem,
    getContentKey,
  } = handlers;

  const onMiniCardDownload = useCallback(
    (item: any) => handlers.handleMiniCardDownload(item, closeAllMenus),
    [handlers, closeAllMenus]
  );

  useEffect(() => {
    if (globalVideoStore.isAutoPlayEnabled && !globalVideoStore.currentlyVisibleVideo && uploadedVideos.length > 0) {
      const timer = setTimeout(() => {
        const videoLayouts = Object.entries(videoLayoutsRef.current).sort((a, b) => a[1].y - b[1].y);
        if (videoLayouts.length > 0) {
          const [mostRecentKey] = videoLayouts[0];
          globalVideoStore.playVideoGlobally(mostRecentKey);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [globalVideoStore.isAutoPlayEnabled, globalVideoStore, uploadedVideos.length]);

  useEffect(() => {
    uploadedVideos.forEach((video) => {
      const key = getVideoKey(video.fileUrl);
      if (globalVideoStore.showOverlay?.[key] === undefined && globalVideoStore.setOverlayVisible) {
        globalVideoStore.setOverlayVisible(key, true);
      }
    });
    const trendingKeys = trendingItems.map((item) => getVideoKey(item.fileUrl));
    const viewedKeys = previouslyViewedState.map((item) => getVideoKey(item.fileUrl));
    [...trendingKeys, ...viewedKeys].forEach((key) => {
      setShowOverlayMini((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    });
  }, [uploadedVideos, trendingItems, previouslyViewedState]);

  useEffect(() => {
    Object.keys(videoRefs.current).forEach(async (key) => {
      const videoRef = videoRefs.current[key];
      const shouldBePlaying = globalVideoStore.playingVideos[key] ?? false;
      if (videoRef) {
        try {
          const status = await videoRef.getStatusAsync();
          if (status.isLoaded) {
            if (shouldBePlaying && !status.isPlaying) await videoRef.playAsync();
            else if (!shouldBePlaying && status.isPlaying) await videoRef.pauseAsync();
          }
        } catch (error) {
          console.error("Error syncing video playback:", error);
        }
      }
    });
  }, [globalVideoStore.playingVideos]);

  useEffect(() => {
    const init = async () => {
      if (uploadedVideos.length > 0) {
        const persistedStats = await getPersistedStats();
        const newStats: Record<string, any> = {};
        for (const video of uploadedVideos) {
          const key = getVideoKey(video.fileUrl);
          const isUserSaved = libraryStore.isItemSaved(key);
          const vs = persistedStats[key] || {};
          newStats[key] = {
            ...vs,
            views: vs.views || (video as any).viewCount || 0,
            sheared: vs.sheared || video.sheared || 0,
            favorite: vs.favorite || video.favorite || 0,
            comment: vs.comment || video.comment || 0,
            totalSaves: vs.totalSaves || video.saved || 0,
            saved: isUserSaved ? 1 : 0,
            userSaved: isUserSaved,
          };
        }
        setVideoStats(newStats);
      }
    };
    init();
  }, [uploadedVideos.length, libraryStore.isLoaded]);

  useEffect(() => {
    enhancedRecommendedForYou.forEach((item) => {
      const key = getVideoKey(item.fileUrl);
      setShowOverlayMini((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    });
  }, [enhancedRecommendedForYou]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        globalVideoStore.pauseAllVideos();
        globalVideoStore.handleVideoVisibilityChange?.(null);
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      mediaStore.refreshUserDataForExistingMedia?.();
    }, [])
  );

  const renderVideoCard = (
    video: VideoCardData,
    index: number,
    sectionId: string,
    playType: "progress" | "center" = "center"
  ) => {
    const modalKey = getVideoKey(video.fileUrl);
    const stats = videoStats[modalKey] || {};
    const mediaItem = convertToMediaItem(video);

    return (
      <VideoCard
        key={modalKey}
        video={mediaItem}
        index={index}
        modalKey={modalKey}
        contentStats={contentStats}
        userFavorites={userFavorites}
        globalFavoriteCounts={globalFavoriteCounts}
        playingVideos={globalVideoStore.playingVideos}
        mutedVideos={globalVideoStore.mutedVideos}
        progresses={globalVideoStore.progresses}
        videoVolume={1.0}
        currentlyVisibleVideo={globalVideoStore.currentlyVisibleVideo}
        onVideoTap={handleVideoTapWrapper}
        onTogglePlay={(key) => togglePlay(key, video)}
        onToggleMute={toggleMuteVideo}
        onLike={(key) => handleLike(key, video)}
        onComment={(key) => handleComment(key, video)}
        onSave={(key) => handleSave(key, video)}
        onDownload={() => handleDownload(convertToDownloadableItem(video, "video"))}
        onShare={(key) => handleShare(key, video)}
        onModalToggle={(key) => setModalVisible(modalVisible === key ? null : key)}
        modalVisible={modalVisible}
        comments={comments}
        checkIfDownloaded={checkIfDownloaded}
        getContentKey={getContentKey}
        getTimeAgo={getTimeAgo}
        getUserDisplayNameFromContent={getUserDisplayNameFromContent}
        getUserAvatarFromContent={getUserAvatarFromContent}
        onLayout={(event, key, _type, _url) => {
          const { y, height } = event.nativeEvent.layout;
          videoLayoutsRef.current[key] = { y, height };
        }}
        isAutoPlayEnabled={globalVideoStore.isAutoPlayEnabled}
      />
    );
  };

  return (
    <View className="flex-1">
      {showSuccessCard && (
        <SuccessCard
          message={successMessage}
          onClose={() => setShowSuccessCard(false)}
          duration={3000}
        />
      )}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-3 w-full"
        onScrollBeginDrag={closeAllMenus}
        onTouchStart={closeAllMenus}
        onScroll={scroll.handleScroll}
        onScrollEndDrag={() => {
          scroll.handleScrollEnd();
          scroll.recomputeVisibilityFromLayouts();
        }}
        onMomentumScrollEnd={() => {
          scroll.handleScrollEnd();
          scroll.recomputeVisibilityFromLayouts();
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={true}
      >
        {uploadedVideos.length > 0 ? (
          <>
            <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">Most Recent</Text>
            {renderVideoCard(
              {
                ...(uploadedVideos[0] as any),
                timeAgo: getTimeAgo(uploadedVideos[0].createdAt),
                speaker: uploadedVideos[0].speaker || "Unknown",
                speakerAvatar:
                  typeof uploadedVideos[0].speakerAvatar === "string"
                    ? uploadedVideos[0].speakerAvatar.trim()
                    : require("../../../assets/images/Avatar-1.png"),
                views: uploadedVideos[0].viewCount || 0,
                favorite: uploadedVideos[0].favorite || 0,
                saved: uploadedVideos[0].saved || 0,
                sheared: uploadedVideos[0].sheared || 0,
                comment: uploadedVideos[0].comment || 0,
              },
              0,
              "uploaded",
              "progress"
            )}
          </>
        ) : (
          <>
            <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">Most Recent</Text>
            <VideoCardSkeleton dark={false} />
          </>
        )}

        <VideoComponentMiniCards
          title="Previously Viewed"
          items={previouslyViewedState}
          modalIndex={pvModalIndex}
          setModalIndex={setPvModalIndex}
          viewsState={miniCardViews}
          setViewsState={setMiniCardViews}
          playingState={miniCardPlaying}
          setPlayingState={setMiniCardPlaying}
          hasPlayed={miniCardHasPlayed}
          setHasPlayed={setMiniCardHasPlayed}
          hasCompleted={miniCardHasCompleted}
          setHasCompleted={setMiniCardHasCompleted}
          onMiniCardPlay={handleMiniCardPlay}
          onCloseAllMenus={closeAllMenus}
          onDownload={onMiniCardDownload}
          checkIfDownloaded={checkIfDownloaded}
          videoVolume={videoVolume}
          globalVideoStore={globalVideoStore}
          miniCardRefs={miniCardRefs}
          showOverlayMini={showOverlayMini}
          setShowOverlayMini={setShowOverlayMini}
          setVideoErrors={setVideoErrors}
          onVideoReload={(key) => handleVideoReload(key, setVideoErrors)}
          videoErrors={videoErrors}
          isLoading={false}
        />

        {firstExploreVideos.length > 0 ? (
          <>
            <Text className="text-[#344054] text-[16px] font-rubik-semibold my-3">Explore More Videos</Text>
            <View className="gap-8">
              {firstExploreVideos.map((video, index) =>
                renderVideoCard(
                  {
                    ...(video as any),
                    timeAgo: getTimeAgo(video.createdAt),
                    speaker: video.speaker || "Unknown",
                    speakerAvatar:
                      typeof video.speakerAvatar === "string"
                        ? video.speakerAvatar.trim()
                        : require("../../../assets/images/Avatar-1.png"),
                    views: video.viewCount || 0,
                    favorite: video.favorite || 0,
                    saved: video.saved || 0,
                    sheared: video.sheared || 0,
                    comment: video.comment || 0,
                  },
                  index + 1,
                  "explore-early",
                  "center"
                )
              )}
            </View>
          </>
        ) : (
          uploadedVideos.length > 0 && (
            <>
              <Text className="text-[#344054] text-[16px] font-rubik-semibold my-3">Explore More Videos</Text>
              <View className="gap-8">
                {Array.from({ length: 3 }).map((_, index) => (
                  <VideoCardSkeleton key={`explore-skeleton-${index}`} dark={false} />
                ))}
              </View>
            </>
          )
        )}

        {trendingItems.length > 0 ? (
          <VideoComponentMiniCards
            title={`Trending Now • ${trendingItems.length} videos`}
            items={trendingItems}
            modalIndex={trendingModalIndex}
            setModalIndex={setTrendingModalIndex}
            viewsState={miniCardViews}
            setViewsState={setMiniCardViews}
            playingState={miniCardPlaying}
            setPlayingState={setMiniCardPlaying}
            hasPlayed={miniCardHasPlayed}
            setHasPlayed={setMiniCardHasPlayed}
            hasCompleted={miniCardHasCompleted}
            setHasCompleted={setMiniCardHasCompleted}
            onMiniCardPlay={handleMiniCardPlay}
            onCloseAllMenus={closeAllMenus}
            onDownload={onMiniCardDownload}
            checkIfDownloaded={checkIfDownloaded}
            videoVolume={videoVolume}
            globalVideoStore={globalVideoStore}
            miniCardRefs={miniCardRefs}
            showOverlayMini={showOverlayMini}
            setShowOverlayMini={setShowOverlayMini}
            setVideoErrors={setVideoErrors}
            onVideoReload={(key) => handleVideoReload(key, setVideoErrors)}
            videoErrors={videoErrors}
            isLoading={false}
          />
        ) : (
          <View className="mt-5 mb-4">
            <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-2 ml-2">Trending Now</Text>
            <View className="bg-gray-50 rounded-lg p-6 mx-2 items-center">
              <Text className="text-[32px] mb-2">📈</Text>
              <Text className="text-[14px] font-rubik-medium text-[#98A2B3] text-center">
                No trending videos yet
              </Text>
              <Text className="text-[12px] font-rubik text-[#D0D5DD] text-center mt-1">
                Keep engaging with content to see trending videos here
              </Text>
            </View>
          </View>
        )}

        {middleExploreVideos.length > 0 ? (
          <>
            <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">Exploring More</Text>
            <View className="gap-8">
              {middleExploreVideos.map((video, index) =>
                renderVideoCard(
                  {
                    ...(video as any),
                    timeAgo: getTimeAgo(video.createdAt),
                    speaker: video.speaker || "Unknown",
                    speakerAvatar:
                      typeof video.speakerAvatar === "string"
                        ? video.speakerAvatar.trim()
                        : require("../../../assets/images/Avatar-1.png"),
                    views: video.viewCount || 0,
                    favorite: video.favorite || 0,
                    saved: video.saved || 0,
                    sheared: video.sheared || 0,
                    comment: video.comment || 0,
                  },
                  index + 50,
                  "explore-middle",
                  "center"
                )
              )}
            </View>
          </>
        ) : (
          uploadedVideos.length > 0 && (
            <>
              <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">Exploring More</Text>
              <View className="gap-8">
                {Array.from({ length: 2 }).map((_, index) => (
                  <VideoCardSkeleton key={`middle-skeleton-${index}`} dark={false} />
                ))}
              </View>
            </>
          )
        )}

        {enhancedRecommendedForYou.length > 0 && (
          <VideoComponentMiniCards
            title={`Recommended for You • ${enhancedRecommendedForYou.length} videos`}
            items={enhancedRecommendedForYou}
            modalIndex={recommendedModalIndex}
            setModalIndex={setRecommendedModalIndex}
            viewsState={miniCardViews}
            setViewsState={setMiniCardViews}
            playingState={miniCardPlaying}
            setPlayingState={setMiniCardPlaying}
            hasPlayed={miniCardHasPlayed}
            setHasPlayed={setMiniCardHasPlayed}
            hasCompleted={miniCardHasCompleted}
            setHasCompleted={setMiniCardHasCompleted}
            onMiniCardPlay={handleMiniCardPlay}
            onCloseAllMenus={closeAllMenus}
            onDownload={onMiniCardDownload}
            checkIfDownloaded={checkIfDownloaded}
            videoVolume={videoVolume}
            globalVideoStore={globalVideoStore}
            miniCardRefs={miniCardRefs}
            showOverlayMini={showOverlayMini}
            setShowOverlayMini={setShowOverlayMini}
            setVideoErrors={setVideoErrors}
            onVideoReload={(key) => handleVideoReload(key, setVideoErrors)}
            videoErrors={videoErrors}
            isLoading={false}
          />
        )}

        {remainingExploreVideos.length > 0 ? (
          <>
            <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">More Videos</Text>
            <View className="gap-8">
              {remainingExploreVideos.map((video, index) =>
                renderVideoCard(
                  {
                    ...(video as any),
                    timeAgo: getTimeAgo(video.createdAt),
                    speaker: video.speaker || "Unknown",
                    speakerAvatar:
                      typeof video.speakerAvatar === "string"
                        ? video.speakerAvatar.trim()
                        : require("../../../assets/images/Avatar-1.png"),
                    views: video.viewCount || 0,
                    favorite: video.favorite || 0,
                    saved: video.saved || 0,
                    sheared: video.sheared || 0,
                    comment: video.comment || 0,
                  },
                  index + 100,
                  "explore-remaining",
                  "center"
                )
              )}
            </View>
          </>
        ) : (
          uploadedVideos.length > 0 && (
            <>
              <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">More Videos</Text>
              <View className="gap-8">
                {Array.from({ length: 2 }).map((_, index) => (
                  <VideoCardSkeleton key={`remaining-skeleton-${index}`} dark={false} />
                ))}
              </View>
            </>
          )
        )}
      </ScrollView>
    </View>
  );
}
