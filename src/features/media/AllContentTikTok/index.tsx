import { useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  InteractionManager,
  RefreshControl,
  Text,
  View,
} from "react-native";

// Shared imports (from src/shared - 3 levels up from AllContentTikTok)
import { UI_CONFIG } from "../../../shared/constants";
import { ContentType, MediaItem } from "../../../shared/types";
import {
  getContentKey,
  getTimeAgo,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
} from "../../../shared/utils";

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
  useContentStatsHelpers,
} from "./hooks";
// Component imports (app is at project root, sibling to src - need 4 levels up)
import { ContentErrorBoundary } from "../../../../app/components/ContentErrorBoundary";
import SuccessCard from "../../../../app/components/SuccessCard";

// Import original stores and hooks (these will be bridged)
import SocketManager from "../../../../app/services/SocketManager";
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
  contentType = "ALL",
  useAuthFeed = false,
}) => {
  const router = useRouter();

  // Media data from the new hook (useAuthFeed so newly uploaded content appears when logged in)
  const {
    allContent,
    defaultContent,
    loading,
    error,
    refreshAllContent,
    getFilteredContent,
    hasContent,
  } = useMedia({ immediate: true, contentType, useAuth: useAuthFeed });

  const queryClient = useQueryClient();
  const handleDeleteSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["all-content"] });
  }, [queryClient]);

  // Global state from original stores
  // ⚠️ NEVER call useGlobalVideoStore() or useGlobalMediaStore() without a selector!
  // Without a selector, Zustand returns the entire state object = new ref every render = infinite loops.

  // Get global video state - select only what we need with REACTIVE SUBSCRIPTIONS
  const playingVideos = useGlobalVideoStore((s) => s.playingVideos);
  const mutedVideos = useGlobalVideoStore((s) => s.mutedVideos);
  const progresses = useGlobalVideoStore((s) => s.progresses);
  const showOverlay = useGlobalVideoStore((s) => s.showOverlay);
  const currentlyPlayingVideo = useGlobalVideoStore(
    (s) => s.currentlyPlayingVideo
  );
  const isAutoPlayEnabled = useGlobalVideoStore((s) => s.isAutoPlayEnabled);
  const pauseAllVideos = useGlobalVideoStore((s) => s.pauseAllVideos);
  const toggleVideoMuteAction = useGlobalVideoStore((s) => s.toggleVideoMute);
  const enableAutoPlay = useGlobalVideoStore((s) => s.enableAutoPlay);
  const pauseVideoAction = useGlobalVideoStore((s) => s.pauseVideo);
  const toggleVideoMuteStore = useGlobalVideoStore((s) => s.toggleVideoMute);

  // Create functions to match what components expect
  // ✅ Use .getState() for imperative calls so function references stay stable
  const playMedia = useCallback((key: string, type: "video" | "audio") => {
    useGlobalMediaStore.getState().playMediaGlobally(key, type);
  }, []);

  const pauseMedia = useCallback((key: string) => {
    useGlobalVideoStore.getState().pauseVideo(key);
  }, []);

  const toggleMute = useCallback((key: string) => {
    useGlobalVideoStore.getState().toggleVideoMute(key);
  }, []);

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

  const { comments } = useInteractionStore();
  const { loadDownloadedItems } = useDownloadStore();

  // Interaction store
  const {
    contentStats,
    toggleLike,
    toggleSave,
    loadContentStats,
    loadingInteraction,
  } = useInteractionStore();

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

  const [socketManager, setSocketManager] = useState<SocketManager | null>(null);
  const [realTimeCounts, setRealTimeCounts] = useState<Record<string, any>>({});

  const videoRefs = useRef<Record<string, any>>({});
  const isMountedRef = useRef(true);
  const [videoVolume, setVideoVolume] = useState<number>(1.0);
  const listRef = useRef<FlatList<MediaItem>>(null);
  const [currentlyVisibleVideo, setCurrentlyVisibleVideo] = useState<string | null>(null);

  useAllContentTikTokSocket(setSocketManager, setRealTimeCounts);

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
    return sourceData;
  }, [allContent, defaultContent]);

  const {
    filteredMediaList,
    categorizedContent,
    mostRecentItem,
    firstFour,
    nextFour,
    rest,
  } = useAllContentTikTokFeedData({
    mediaList,
    contentType,
    setPreviouslyViewed,
    setIsLoadingContent,
  });

  const {
    getUserLikeState,
    getLikeCount,
    getUserSaveState,
    getCommentCount,
  } = useContentStatsHelpers(contentStats);

  // ✅ Stable reference: use .getState() so this callback never changes
  const pauseAllMedia = useCallback(() => {
    useGlobalVideoStore.getState().pauseAllVideos();
    pauseAllAudio();
  }, [pauseAllAudio]);

  const {
    handleScroll,
    handleScrollEnd,
    handleContentLayout,
  } = useAllContentTikTokScroll({
    isAutoPlayEnabled,
    currentlyVisibleVideo,
    setCurrentlyVisibleVideo,
    pauseAllMedia,
    playMedia,
    playingVideos,
    playingAudioId,
    pauseAllAudio,
    pauseMedia,
    filteredMediaList,
    getContentKey,
    isVideoPlaying,
  });

  const toggleVideoMute = useCallback((key: string) => useGlobalVideoStore.getState().toggleVideoMute(key), []);

  const {
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
  } = useAllContentTikTokHandlers({
    contentType,
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
    setRefreshing,
    socketManager,
    toggleLike,
    toggleSave,
    loadDownloadedItems,
  });

  const renderContentByType = useCallback(
    (item: MediaItem, index: number) => (
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
        onFavorite={handleFavorite}
        onComment={handleComment}
        onSave={handleSave}
        onShare={handleShare}
        onDownload={handleDownloadPress}
        onModalToggle={toggleModal}
        onLayout={handleContentLayout}
        onPause={pauseAllAudio}
        onDelete={handleDeleteSuccess}
        playAudio={playAudio}
        pauseAllAudio={pauseAllAudio}
        checkIfDownloaded={checkIfDownloaded}
        getTimeAgo={getTimeAgo}
        getUserDisplayNameFromContent={getUserDisplayNameFromContent}
        getUserAvatarFromContent={getUserAvatarFromContent}
        isAutoPlayEnabled={isAutoPlayEnabled}
      />
    ),
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
      handleFavorite,
      handleComment,
      handleSave,
      handleShare,
      handleDownloadPress,
      toggleModal,
      handleContentLayout,
      pauseAllAudio,
      handleDeleteSuccess,
      playAudio,
      checkIfDownloaded,
      getTimeAgo,
      getUserDisplayNameFromContent,
      getUserAvatarFromContent,
      isAutoPlayEnabled,
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

  // Keep a ref to filteredMediaList so we can access it in useFocusEffect
  // without adding it as a dependency (which would cause cleanup to fire on every data change)
  const filteredMediaListRef = useRef(filteredMediaList);
  useEffect(() => {
    filteredMediaListRef.current = filteredMediaList;
  }, [filteredMediaList]);

  // Pause all media when component loses focus
  // CRITICAL: Use EMPTY deps [] — all callbacks use .getState() or refs so they're always stable.
  // Any dependency here that changes on render will re-run cleanup = infinite pause loop.
  useFocusEffect(
    useCallback(() => {
      // Defer batch stats to avoid blocking initial render; refresh likes after login
      const ids = (filteredMediaListRef.current || []).slice(0, 32).map((i) => i._id).filter(Boolean) as string[];
      if (ids.length > 0) {
        InteractionManager.runAfterInteractions(() => {
          useInteractionStore.getState().loadBatchContentStats(ids, "media", { forceRefresh: true }).catch(() => { });
        });
      }
      return () => {
        if (__DEV__) console.log("📱 Pausing all media on focus loss");
        try {
          useGlobalVideoStore.getState().pauseAllVideos();
        } catch { }
        setCurrentlyVisibleVideo(null);
      };
    }, [])
  );

  // FlatList hooks must run unconditionally (before any early return) to satisfy Rules of Hooks
  const listHeaderComponent = useMemo(
    () => (
      <ContentFeedHeader
        mostRecentItem={mostRecentItem}
        contentType={contentType}
        filteredMediaListLength={filteredMediaList.length}
        firstFour={firstFour}
        nextFour={nextFour}
        renderContentByType={renderContentByType}
      />
    ),
    [mostRecentItem, contentType, filteredMediaList.length, firstFour, nextFour, renderContentByType]
  );

  const renderListItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) =>
      renderContentByType(item, index + firstFour.length + nextFour.length),
    [renderContentByType, firstFour.length, nextFour.length]
  );

  const keyExtractor = useCallback(
    (item: MediaItem) => getContentKey(item),
    []
  );

  const listFooterComponent = useMemo(
    () =>
      loading && hasContent ? (
        <View
          style={{ padding: UI_CONFIG.SPACING.LG, alignItems: "center" }}
        >
          <ActivityIndicator
            size="small"
            color={UI_CONFIG.COLORS.PRIMARY}
          />
          <Text
            style={{
              marginTop: UI_CONFIG.SPACING.SM,
              color: UI_CONFIG.COLORS.TEXT_SECONDARY,
            }}
          >
            Loading content...
          </Text>
        </View>
      ) : null,
    [loading, hasContent]
  );

  if (loading && !hasContent) return <LoadingState />;
  if (error && !hasContent) return <ErrorState message={error} />;
  if (filteredMediaList.length === 0) return <EmptyState contentType={contentType} />;

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
        <FlatList
          ref={listRef}
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
          scrollEventThrottle={8}
          removeClippedSubviews={true}
          maxToRenderPerBatch={6}
          windowSize={5}
          initialNumToRender={4}
          updateCellsBatchingPeriod={100}
        />
      </View>
    </ContentErrorBoundary>
  );
};
