import { useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RefreshControl,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";

// FlashList v2 type workaround
const FeedList = FlashList as any;

// Shared imports
import { UI_CONFIG } from "../../../shared/constants";
import { ContentType, MediaItem } from "../../../shared/types";
import {
  getContentKey,
  getTimeAgo,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
  isAudioSermon,
} from "../../../shared/utils";
import { PERF, perfMark, perfMeasure } from "../../../shared/utils/perfMarks";
import {
  refreshFeedAfterDelete,
  removeMediaFromFeedCaches,
} from "../../../shared/utils/removeMediaFromFeedCaches";
import { prefetchVideoUrls } from "../../../shared/utils/videoPrefetch";
import { getVideoUrlFromMedia } from "../../../shared/utils/videoUrlManager";

// Feature-specific imports
import { useQueryClient } from "@tanstack/react-query";
import { useMedia } from "../../../shared/hooks/useMedia";
import { ContentFeedHeader } from "./components/ContentFeedHeader";
import { EmptyState, ErrorState, LoadingState } from "./components/ContentFeedStates";
import { ContentItemRenderer } from "./components/ContentItemRenderer";
import {
  useAllContentTikTokAudio,
  useAllContentTikTokFeedData,
  useAllContentTikTokHandlers,
  useAllContentTikTokScroll,
  useAllContentTikTokSocket,
  useAdjacentVideoPrefetch,
  useAdjacentCommentsPrefetch,
  useActiveMediaPlayback,
  useContentStatsHelpers,
  useFeedFocusLoop,
} from "./hooks";
import { ContentErrorBoundary } from "../../../../app/components/ContentErrorBoundary";
import SuccessCard from "../../../../app/components/SuccessCard";
import { useUserProfile } from "../../../../app/hooks/useUserProfile";
import { useDownloadStore } from "../../../../app/store/useDownloadStore";
import { useGlobalMediaStore } from "../../../../app/store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../../../../app/store/useGlobalVideoStore";
import { useInteractionStore } from "../../../../app/store/useInteractionStore";

export interface AllContentTikTokProps {
  contentType?: ContentType | "ALL";
  /** When true, fetches from authenticated endpoint so user's uploads appear in feed */
  useAuthFeed?: boolean;
}

export const AllContentTikTok: React.FC<AllContentTikTokProps> = ({
  contentType: activeTab = "ALL",
  useAuthFeed = false,
}) => {
  const { user } = useUserProfile();
  const currentUserId = user?._id || user?.id || null;

  // Media data from the new hook (useAuthFeed so newly uploaded content appears when logged in)
  const {
    allContent,
    defaultContent,
    error,
    loading: feedLoading,
    refreshAllContent,
    getFilteredContent,
    hasContent,
  } = useMedia({ immediate: true, contentType: activeTab, useAuth: useAuthFeed });

  const queryClient = useQueryClient();
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());

  const handleDeleteSuccess = useCallback(
    (deleted?: MediaItem | { _id?: string; id?: string }) => {
      const id = String(deleted?._id || (deleted as any)?.id || "").trim();
      if (id) {
        setRemovedIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        removeMediaFromFeedCaches(queryClient, id);
      }
      // Soft refresh like big platforms — cache already updated above
      refreshFeedAfterDelete(queryClient);
      void refreshAllContent();
    },
    [queryClient, refreshAllContent]
  );

  // Get global video state - FIX: Read from the same store we write to with REACTIVE SUBSCRIPTIONS
  // Using specific selectors for stability
  const playMediaGlobally = useGlobalMediaStore((s) => s.playMediaGlobally);
  const pauseAllMediaGlobally = useGlobalMediaStore((s) => s.pauseAllMedia);

  const pauseVideoAction = useGlobalVideoStore((s) => s.pauseVideo);
  const pauseAllVideosAction = useGlobalVideoStore((s) => s.pauseAllVideos);
  const toggleVideoMuteAction = useGlobalVideoStore((s) => s.toggleVideoMute);
  const enableAutoPlayAction = useGlobalVideoStore((s) => s.enableAutoPlay);

  const playingVideos = useGlobalVideoStore((s) => s.playingVideos);
  const mutedVideos = useGlobalVideoStore((s) => s.mutedVideos);
  const progresses = useGlobalVideoStore((s) => s.progresses);
  const showOverlay = useGlobalVideoStore((s) => s.showOverlay);
  const currentlyPlayingVideo = useGlobalVideoStore(
    (s) => s.currentlyPlayingVideo
  );
  const isAutoPlayEnabled = useGlobalVideoStore((s) => s.isAutoPlayEnabled);

  // Create functions to match what components expect
  const playMedia = useCallback((key: string, type: "video" | "audio") => {
    // ✅ Use unified media store for both video and audio to handle mutual pausing
    // This ensures video pauses audio and audio pauses video
    playMediaGlobally(key, type);
  }, [playMediaGlobally]);

  const pauseMedia = useCallback((key: string) => {
    pauseVideoAction(key);
  }, [pauseVideoAction]);

  const toggleMute = useCallback((key: string) => {
    toggleVideoMuteAction(key);
  }, [toggleVideoMuteAction]);

  const {
    isLoadingAudio,
    playingAudioId,
    audioProgressMap,
    playAudio,
    pauseAllAudio,
  } = useAllContentTikTokAudio({
    playMedia,
    playingVideos,
  });

  const comments = useInteractionStore((s) => s.comments);
  const { loadDownloadedItems } = useDownloadStore();

  // Interaction store — select fields so hydrate no-ops don't thrash the feed
  const contentStats = useInteractionStore((s) => s.contentStats);
  const toggleLike = useInteractionStore((s) => s.toggleLike);
  const toggleSave = useInteractionStore((s) => s.toggleSave);
  const recordShare = useInteractionStore((s) => s.recordShare);
  const loadContentStats = useInteractionStore((s) => s.loadContentStats);
  const loadingInteraction = useInteractionStore((s) => s.loadingInteraction);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState<string | null>(null);

  // Success card state
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const toggleModal = useCallback((val: string | null) => {
    setModalVisible(val);
  }, []);
  const [previouslyViewed, setPreviouslyViewed] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const videoRefs = useRef<Record<string, any>>({});
  const isMountedRef = useRef(true);
  const [videoVolume, setVideoVolume] = useState<number>(1.0);
  const [currentlyVisibleVideo, setCurrentlyVisibleVideo] = useState<string | null>(null);

  // Helper functions to get state for specific keys
  const getVideoState = (key: string) => ({
    isPlaying: playingVideos[key] ?? false,
    isMuted: mutedVideos[key] ?? false,
    progress: progresses[key] ?? 0,
    showOverlay: showOverlay[key] ?? false,
  });
  const isVideoPlaying = (key: string) => playingVideos[key] ?? false;
  const isVideoMuted = (key: string) => mutedVideos[key] ?? false;
  const getVideoProgress = (key: string) => progresses[key] ?? 0;
  const getVideoOverlay = (key: string) => showOverlay[key] ?? false;

  // Use content directly - useMedia already returns transformed MediaItem[]
  const mediaList: MediaItem[] = useMemo(() => {
    const sourceData = allContent.length > 0 ? allContent : defaultContent;
    if (!sourceData || !Array.isArray(sourceData)) return [];
    if (removedIds.size === 0) return sourceData;
    return sourceData.filter(
      (item) => !removedIds.has(String(item._id || (item as any).id || ""))
    );
  }, [allContent, defaultContent, removedIds]);

  const {
    filteredMediaList,
    categorizedContent,
    mostRecentItem,
    firstFour,
    nextFour,
    rest,
    reshuffleFeed,
  } = useAllContentTikTokFeedData({
    mediaList,
    contentType: activeTab,
    setPreviouslyViewed,
    setIsLoadingContent,
    previouslyViewed,
  });

  // Stable feed order for adjacent player mounting (Most Recent → For You).
  const orderedFeedKeys = useMemo(() => {
    const keys: string[] = [];
    if (mostRecentItem) keys.push(getContentKey(mostRecentItem));
    for (const item of firstFour) keys.push(getContentKey(item));
    for (const item of rest) keys.push(getContentKey(item));
    return keys;
  }, [mostRecentItem, firstFour, rest]);

  // Seed focus so the first cards mount players immediately (no poster-only flash).
  useEffect(() => {
    if (currentlyVisibleVideo) return;
    if (!mostRecentItem) return;
    setCurrentlyVisibleVideo(getContentKey(mostRecentItem));
  }, [currentlyVisibleVideo, mostRecentItem]);

  const focusedFeedItem = useMemo(() => {
    if (!currentlyVisibleVideo) return null;
    return (
      filteredMediaList.find(
        (item) => getContentKey(item) === currentlyVisibleVideo
      ) ?? null
    );
  }, [currentlyVisibleVideo, filteredMediaList, getContentKey]);

  useAllContentTikTokSocket({
    focusedContentId: focusedFeedItem
      ? String(focusedFeedItem._id || getContentKey(focusedFeedItem))
      : currentlyVisibleVideo,
    focusedContentType: focusedFeedItem?.contentType || "media",
  });

  useAdjacentVideoPrefetch({
    focusedKey: currentlyVisibleVideo,
    items: filteredMediaList,
    getContentKey,
    ahead: 4,
  });

  useAdjacentCommentsPrefetch({
    focusedKey: currentlyVisibleVideo,
    items: filteredMediaList,
    getContentKey,
    radius: 1,
  });

  // Aggressively warm the first cards' bytes so players aren't poster-stuck
  useEffect(() => {
    if (filteredMediaList.length === 0) return;
    const urls = filteredMediaList
      .slice(0, 8)
      .map((item) => getVideoUrlFromMedia(item))
      .filter(Boolean) as string[];
    if (urls.length) prefetchVideoUrls(urls);
  }, [filteredMediaList]);

  const feedFirstPaintMarkedRef = useRef(false);
  useEffect(() => {
    if (feedFirstPaintMarkedRef.current) return;
    if (filteredMediaList.length === 0) return;
    feedFirstPaintMarkedRef.current = true;
    perfMark(PERF.FEED_FIRST_PAINT);
    perfMeasure(PERF.FEED_FIRST_PAINT, PERF.APP_START);
  }, [filteredMediaList.length]);

  const {
    getUserLikeState,
    getLikeCount,
    getUserSaveState,
    getCommentCount,
  } = useContentStatsHelpers(contentStats);

  const pauseAllMedia = useCallback(() => {
    pauseAllVideosAction();
    pauseAllAudio();
  }, [pauseAllVideosAction, pauseAllAudio]);

  const {
    setListHostRef,
    registerFocusTarget,
    onScrollForFocus,
    evaluateFocus,
  } = useFeedFocusLoop({
    enabled: isAutoPlayEnabled,
    focusedKey: currentlyVisibleVideo,
    setFocusedKey: setCurrentlyVisibleVideo,
  });

  useActiveMediaPlayback({
    enabled: isAutoPlayEnabled,
    focusedKey: currentlyVisibleVideo,
    items: filteredMediaList,
    getContentKey,
    playMedia,
    pauseAllMedia,
    isAudioItem: (item) => isAudioSermon(item),
  });

  const { handleScroll, handleScrollEnd, bindFocusRef } =
    useAllContentTikTokScroll({
      onScrollForFocus,
      registerFocusTarget,
      evaluateFocus,
    });

  const shouldMountPlayer = useCallback(
    (key: string) => {
      if (!currentlyVisibleVideo) {
        return orderedFeedKeys[0] === key;
      }
      const idx = orderedFeedKeys.indexOf(currentlyVisibleVideo);
      if (idx < 0) return key === currentlyVisibleVideo;
      const candidate = orderedFeedKeys.indexOf(key);
      if (candidate < 0) return false;
      return Math.abs(candidate - idx) <= 1;
    },
    [currentlyVisibleVideo, orderedFeedKeys]
  );

  const toggleVideoMute = useCallback((key: string) => toggleVideoMuteAction(key), [toggleVideoMuteAction]);

  const {
    handleVideoTap,
    handleLike,
    handleComment,
    handleSave,
    handleShare,
    handleDownloadPress,
    handleRefresh,
    togglePlay,
    checkIfDownloaded,
  } = useAllContentTikTokHandlers({
    contentType: activeTab,
    filteredMediaList,
    categorizedContent,
    contentStats,
    getContentKey,
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
    reshuffleFeed,
    setRefreshing,
    toggleLike: toggleLike as any,
    toggleSave: toggleSave as any,
    recordShare: recordShare as any,
    loadDownloadedItems,
  });

  const renderContentByType = useCallback(
    (item: MediaItem, index: number, _ignored?: boolean) => {
      const key = getContentKey(item);
      const focusType =
        isAudioSermon(item) ||
        String(item.contentType || "").toLowerCase().includes("music") ||
        String(item.contentType || "").toLowerCase().includes("audio")
          ? "music"
          : "video";

      return (
        <ContentItemRenderer
          item={item}
          index={index}
          getContentKey={getContentKey}
          getUserLikeState={getUserLikeState}
          getLikeCount={getLikeCount}
          contentStats={contentStats}
          playingVideos={playingVideos}
          mutedVideos={mutedVideos}
          progresses={progresses}
          videoVolume={videoVolume}
          currentlyVisibleVideo={currentlyVisibleVideo}
          playingAudioId={playingAudioId}
          audioProgressMap={audioProgressMap}
          modalVisible={modalVisible}
          comments={comments}
          onVideoTap={handleVideoTap}
          onTogglePlay={togglePlay}
          onToggleMute={toggleVideoMute}
          onLike={handleLike}
          onComment={handleComment}
          onSave={handleSave}
          onShare={handleShare}
          onDownload={handleDownloadPress}
          onModalToggle={toggleModal}
          onLayout={undefined}
          onPause={pauseAllAudio}
          onDelete={handleDeleteSuccess}
          playAudio={playAudio}
          pauseAllAudio={pauseAllAudio}
          checkIfDownloaded={checkIfDownloaded}
          getTimeAgo={getTimeAgo}
          getUserDisplayNameFromContent={getUserDisplayNameFromContent}
          getUserAvatarFromContent={getUserAvatarFromContent}
          isAutoPlayEnabled={isAutoPlayEnabled}
          currentUserId={currentUserId}
          shouldRenderPlayer={shouldMountPlayer(key)}
          focusRef={bindFocusRef(key, focusType)}
        />
      );
    },
    [
      getContentKey,
      getUserLikeState,
      getLikeCount,
      contentStats,
      playingVideos,
      mutedVideos,
      progresses,
      videoVolume,
      currentlyVisibleVideo,
      playingAudioId,
      audioProgressMap,
      modalVisible,
      comments,
      handleVideoTap,
      togglePlay,
      toggleVideoMute,
      handleLike,
      handleComment,
      handleSave,
      handleShare,
      handleDownloadPress,
      toggleModal,
      pauseAllAudio,
      handleDeleteSuccess,
      playAudio,
      checkIfDownloaded,
      isAutoPlayEnabled,
      currentUserId,
      shouldMountPlayer,
      bindFocusRef,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      try {
        pauseAllMedia();
      } catch { }
    };
  }, []);

  // Stats are loaded via useAllContentTikTokFeedData — no duplicate needed

  // Pause all media when component loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (__DEV__) console.log("📱 Pausing all media on focus loss");
        try {
          pauseAllMedia();
        } catch { }
        setCurrentlyVisibleVideo(null);
        pauseAllAudio();
      };
    }, [pauseAllMedia, pauseAllAudio])
  );

  // Hooks must run unconditionally (before any early return) to satisfy Rules of Hooks
  const listHeaderComponent = useMemo(
    () => (
      <ContentFeedHeader
        mostRecentItem={mostRecentItem}
        contentType={activeTab}
        filteredMediaListLength={filteredMediaList.length}
        firstFour={firstFour}
        currentlyVisibleVideo={currentlyVisibleVideo}
        getContentKey={getContentKey}
        renderContentByType={renderContentByType}
      />
    ),
    [
      mostRecentItem,
      activeTab,
      filteredMediaList.length,
      firstFour,
      currentlyVisibleVideo,
      getContentKey,
      renderContentByType,
    ]
  );

  const renderListItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => {
      return renderContentByType(item, index + firstFour.length + 1);
    },
    [renderContentByType, firstFour.length]
  );

  const keyExtractor = useCallback(
    (item: MediaItem) => getContentKey(item),
    []
  );

  const listFooterComponent = useMemo(() => null, []);
  if (error && !hasContent) return <ErrorState message={error} />;
  if (feedLoading && filteredMediaList.length === 0) {
    return <LoadingState count={2} />;
  }
  if (filteredMediaList.length === 0) return <EmptyState contentType={activeTab} />;

  return (
    <ContentErrorBoundary>
      <View style={{ flex: 1 }}>
        {showSuccessCard && (
          <SuccessCard
            message={successMessage}
            onClose={() => setShowSuccessCard(false)}
            duration={3000}
          />
        )}
        <View style={{ flex: 1 }} ref={setListHostRef} collapsable={false}>
        <FeedList
          data={rest}
          renderItem={renderListItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={listHeaderComponent}
          ListFooterComponent={listFooterComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[UI_CONFIG.COLORS.PRIMARY]}
              tintColor={UI_CONFIG.COLORS.PRIMARY}
            />
          }
          showsVerticalScrollIndicator={true}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          estimatedItemSize={500}
          keyboardShouldPersistTaps="handled"
          overscan={500}
        />
        </View>
      </View>
    </ContentErrorBoundary>
  );
};
