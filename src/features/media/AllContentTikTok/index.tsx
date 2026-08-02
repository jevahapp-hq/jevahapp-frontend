import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AppState,
  type AppStateStatus,
  RefreshControl,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQueryClient } from "@tanstack/react-query";

import { UI_CONFIG } from "../../../shared/constants";
import { useMedia } from "../../../shared/hooks/useMedia";
import { ContentType, MediaItem } from "../../../shared/types";
import {
  buildStableFeedMediaList,
  getContentKey,
  getTimeAgo,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
} from "../../../shared/utils";

import { EmptyState, ErrorState, LoadingState } from "./components/ContentFeedStates";
import { ContentItemRenderer } from "./components/ContentItemRenderer";
import { FeedSectionTitle } from "./components/FeedSectionTitle";
import { LiveComingSoonCard } from "./components/LiveComingSoonCard";
import { getFeedContentKind } from "./utils/feedContentKind";
import type { FeedRow } from "./types";

import {
  useAllContentTikTokAudio,
  useAllContentTikTokFeedData,
  useAllContentTikTokHandlers,
  useAllContentTikTokSocket,
  useContentStatsHelpers,
  useFeedDecoderWindow,
  useFeedListRows,
  useFeedViewability,
  useMostRecentFastPath,
} from "./hooks";

import { ContentErrorBoundary } from "../../../../app/components/ContentErrorBoundary";
import SuccessCard from "../../../../app/components/SuccessCard";
import { useUserProfile } from "../../../../app/hooks/useUserProfile";
import SocketManager from "../../../../app/services/SocketManager";
import { useDownloadStore } from "../../../../app/store/useDownloadStore";
import { useGlobalMediaStore } from "../../../../app/store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../../../../app/store/useGlobalVideoStore";
import { useInteractionStore } from "../../../../app/store/useInteractionStore";

const FeedList = FlashList as any;

export interface AllContentTikTokProps {
  contentType?: ContentType | "ALL";
  /** When true, fetches from authenticated endpoint so user's uploads appear in feed */
  useAuthFeed?: boolean;
  /**
   * When false (hidden category pane), don't autoplay / steal the global
   * player. Feed stays mounted so scroll + surfaces survive tab switches.
   */
  isFeedActive?: boolean;
  /**
   * Keep expo-av surfaces mounted while this feed is hidden so returning
   * to the category isn't a white remount.
   */
  keepVideoDecoders?: boolean;
}

export const AllContentTikTok: React.FC<AllContentTikTokProps> = ({
  contentType: activeTab = "ALL",
  useAuthFeed = false,
  isFeedActive = true,
  keepVideoDecoders = false,
}) => {
  const { user } = useUserProfile();
  const currentUserId = user?._id || user?.id || null;

  const {
    allContent,
    defaultContent,
    loading,
    error,
    refreshAllContent,
    loadMoreContent,
    isLoadingMore,
    hasMoreDefaultPages,
    hasContent,
  } = useMedia({ immediate: true, contentType: activeTab, useAuth: useAuthFeed });

  const queryClient = useQueryClient();
  const handleDeleteSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["all-content"] });
  }, [queryClient]);

  const playMediaGlobally = useGlobalMediaStore((s) => s.playMediaGlobally);
  const pauseVideoAction = useGlobalVideoStore((s) => s.pauseVideo);
  const pauseAllVideosAction = useGlobalVideoStore((s) => s.pauseAllVideos);
  const toggleVideoMuteAction = useGlobalVideoStore((s) => s.toggleVideoMute);
  const enableAutoPlayAction = useGlobalVideoStore((s) => s.enableAutoPlay);

  const playingVideos = useGlobalVideoStore((s) => s.playingVideos);
  const mutedVideos = useGlobalVideoStore((s) => s.mutedVideos);
  const progresses = useGlobalVideoStore((s) => s.progresses);
  const currentlyPlayingVideo = useGlobalVideoStore(
    (s) => s.currentlyPlayingVideo
  );
  const isAutoPlayEnabled = useGlobalVideoStore((s) => s.isAutoPlayEnabled);

  const playMedia = useCallback(
    (key: string, type: "video" | "audio") => {
      playMediaGlobally(key, type);
    },
    [playMediaGlobally]
  );

  const pauseMedia = useCallback(
    (key: string) => {
      pauseVideoAction(key);
    },
    [pauseVideoAction]
  );

  const {
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
  const {
    contentStats,
    toggleLike,
    toggleSave,
  } = useInteractionStore();

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const toggleModal = useCallback((val: string | null) => {
    setModalVisible(val);
  }, []);
  const [, setPreviouslyViewed] = useState<any[]>([]);
  const [, setIsLoadingContent] = useState(false);

  const [socketManager, setSocketManager] = useState<SocketManager | null>(null);
  const realTimeCountsRef = useRef<Record<string, any>>({});
  const setRealTimeCounts = useCallback(
    (updater: (prev: Record<string, any>) => Record<string, any>) => {
      realTimeCountsRef.current = updater(realTimeCountsRef.current);
    },
    []
  );

  const [videoVolume] = useState<number>(1.0);
  const [currentlyVisibleVideo, setCurrentlyVisibleVideo] = useState<
    string | null
  >(null);
  const currentlyVisibleVideoRef = useRef<string | null>(null);
  const isFeedActiveRef = useRef(isFeedActive);
  const isAutoPlayEnabledRef = useRef(isAutoPlayEnabled);
  const wasFeedActiveRef = useRef(isFeedActive);
  const hasDeterminedVisibilityRef = useRef(false);

  useEffect(() => {
    currentlyVisibleVideoRef.current = currentlyVisibleVideo;
  }, [currentlyVisibleVideo]);
  useEffect(() => {
    isFeedActiveRef.current = isFeedActive;
  }, [isFeedActive]);
  useEffect(() => {
    isAutoPlayEnabledRef.current = isAutoPlayEnabled;
  }, [isAutoPlayEnabled]);

  useAllContentTikTokSocket(setSocketManager, setRealTimeCounts);

  const mediaList: MediaItem[] = useMemo(
    () => buildStableFeedMediaList(defaultContent, allContent),
    [allContent, defaultContent]
  );

  const {
    filteredMediaList,
    categorizedContent,
    mostRecentItem,
    firstFour,
    rest,
  } = useAllContentTikTokFeedData({
    mediaList,
    contentType: activeTab,
    setPreviouslyViewed,
    setIsLoadingContent,
  });

  const { getUserLikeState, getLikeCount, getUserSaveState, getCommentCount } =
    useContentStatsHelpers(contentStats);

  const getFeedPlaybackKey = useCallback(
    (item: MediaItem) => `${activeTab}::${getContentKey(item)}`,
    [activeTab]
  );

  const pauseAllMedia = useCallback(() => {
    pauseAllVideosAction();
    pauseAllAudio();
  }, [pauseAllVideosAction, pauseAllAudio]);

  const toggleVideoMute = useCallback(
    (key: string) => toggleVideoMuteAction(key),
    [toggleVideoMuteAction]
  );

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
    setRefreshing,
    socketManager,
    toggleLike: toggleLike as any,
    toggleSave: toggleSave as any,
    loadDownloadedItems,
  });

  const noopLayout = useCallback(() => {}, []);

  const {
    listData,
    mediaSeqByKeyRef,
    mediaKeyBySeqRef,
    mediaItemBySeqRef,
    heroRowKey,
  } = useFeedListRows({
    mostRecentItem,
    firstFour,
    rest,
    activeTab,
    filteredMediaListLength: filteredMediaList.length,
    getFeedPlaybackKey,
  });

  const { heroPrimed, onHeroSurfaceReadyChange, isHeroRow } =
    useMostRecentFastPath({
      mostRecentItem,
      heroRowKey,
      listData,
      isFeedActive,
      isAutoPlayEnabled,
      isAutoPlayEnabledRef,
      currentlyVisibleVideoRef,
      hasDeterminedVisibilityRef,
      setCurrentlyVisibleVideo,
      playMedia,
      mediaItemBySeqRef,
    });

  const { shouldRenderPlayer, mountedPlayerSig } = useFeedDecoderWindow({
    listData,
    currentlyVisibleVideo,
    currentlyVisibleVideoRef,
    hasDeterminedVisibilityRef,
    isFeedActive,
    keepVideoDecoders,
    heroRowKey,
    heroPrimed,
    mediaSeqByKeyRef,
    mediaKeyBySeqRef,
    mediaItemBySeqRef,
  });

  const { viewabilityConfigCallbackPairs } = useFeedViewability({
    isFeedActiveRef,
    isAutoPlayEnabledRef,
    currentlyVisibleVideoRef,
    hasDeterminedVisibilityRef,
    setCurrentlyVisibleVideo,
    playMedia,
    pauseMedia,
    playingVideos,
    playingAudioId,
    pauseAllAudio,
  });

  const renderContentByType = useCallback(
    (
      item: MediaItem,
      index: number,
      renderPlayer?: boolean,
      feedRowKey?: string,
      isHero?: boolean
    ) => (
      <ContentItemRenderer
        item={item}
        index={index}
        getContentKey={getContentKey}
        getPlaybackKey={getFeedPlaybackKey}
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
        onLayout={noopLayout}
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
        shouldRenderPlayer={renderPlayer}
        isFeedActive={isFeedActive}
        feedRowKey={feedRowKey}
        isHero={isHero}
        onSurfaceReadyChange={
          isHero ? onHeroSurfaceReadyChange : undefined
        }
      />
    ),
    [
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
      noopLayout,
      pauseAllAudio,
      handleDeleteSuccess,
      playAudio,
      checkIfDownloaded,
      isAutoPlayEnabled,
      currentUserId,
      getFeedPlaybackKey,
      isFeedActive,
      onHeroSurfaceReadyChange,
    ]
  );

  useEffect(() => {
    return () => {
      try {
        pauseAllMedia();
      } catch {
        // no-op
      }
    };
  }, [pauseAllMedia]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next !== "active") {
        if (!isFeedActiveRef.current) return;
        try {
          pauseAllMedia();
        } catch {
          // no-op
        }
        pauseAllAudio();
        return;
      }
      if (!isFeedActiveRef.current) return;
      const key = currentlyVisibleVideoRef.current;
      if (key && isAutoPlayEnabledRef.current) {
        playMedia(key, "video");
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [pauseAllMedia, pauseAllAudio, playMedia]);

  useEffect(() => {
    if (!isFeedActive) {
      if (wasFeedActiveRef.current) {
        try {
          pauseAllMedia();
        } catch {
          // no-op
        }
        pauseAllAudio();
      }
      wasFeedActiveRef.current = false;
      return;
    }

    if (!wasFeedActiveRef.current) {
      const key = currentlyVisibleVideoRef.current;
      if (key && isAutoPlayEnabledRef.current) {
        requestAnimationFrame(() => {
          if (!isFeedActiveRef.current) return;
          playMedia(key, "video");
        });
      }
    }
    wasFeedActiveRef.current = true;
  }, [isFeedActive, pauseAllMedia, pauseAllAudio, playMedia]);

  const getItemType = useCallback((row: FeedRow) => {
    if (row.rowType !== "media") return row.rowType;
    return `media-${getFeedContentKind(row.item)}`;
  }, []);

  const renderRow = useCallback(
    ({ item: row }: { item: FeedRow }) => {
      switch (row.rowType) {
        case "section-title":
          return <FeedSectionTitle title={row.title} />;
        case "coming-soon":
          return <LiveComingSoonCard />;
        case "spacer":
          return <View style={{ height: row.height }} />;
        case "media":
          return renderContentByType(
            row.item,
            row.renderIndex,
            shouldRenderPlayer(row.key),
            row.key,
            !!row.isHero || isHeroRow(row.key)
          );
        default:
          return null;
      }
    },
    [renderContentByType, shouldRenderPlayer, isHeroRow]
  );

  const keyExtractor = useCallback((row: FeedRow) => row.key, []);

  const feedExtraData = useMemo(
    () => ({
      visible: currentlyVisibleVideo,
      primed: mountedPlayerSig,
      playing: currentlyPlayingVideo,
      active: isFeedActive,
      heroPrimed,
    }),
    [
      currentlyVisibleVideo,
      mountedPlayerSig,
      currentlyPlayingVideo,
      isFeedActive,
      heroPrimed,
    ]
  );

  const handleEndReached = useCallback(() => {
    if (isLoadingMore || !hasMoreDefaultPages) return;
    loadMoreContent();
  }, [isLoadingMore, hasMoreDefaultPages, loadMoreContent]);

  useEffect(() => {
    if (activeTab !== "ALL" && activeTab !== "live") return;
    if (rest.length >= 12) return;
    if (!hasMoreDefaultPages || isLoadingMore) return;
    loadMoreContent();
  }, [
    activeTab,
    rest.length,
    hasMoreDefaultPages,
    isLoadingMore,
    loadMoreContent,
  ]);

  const forcedComingSoonLoadRef = useRef(false);
  useEffect(() => {
    if (activeTab !== "ALL" && activeTab !== "live") {
      forcedComingSoonLoadRef.current = false;
      return;
    }
    if (rest.length > 0) {
      forcedComingSoonLoadRef.current = false;
      return;
    }
    if (forcedComingSoonLoadRef.current) return;
    if (filteredMediaList.length < 5) return;
    if (isLoadingMore || !hasMoreDefaultPages) return;
    forcedComingSoonLoadRef.current = true;
    loadMoreContent();
  }, [
    activeTab,
    rest.length,
    filteredMediaList.length,
    isLoadingMore,
    hasMoreDefaultPages,
    loadMoreContent,
  ]);

  // Enable before Most Recent cold-start can observe it (layout, not paint).
  useEffect(() => {
    enableAutoPlayAction();
  }, [enableAutoPlayAction]);

  if (error && !hasContent) return <ErrorState message={error} />;

  if (!isFeedActive && filteredMediaList.length === 0) {
    return <View style={{ flex: 1 }} />;
  }

  if (isFeedActive && filteredMediaList.length === 0 && loading) {
    return <LoadingState />;
  }

  if (filteredMediaList.length === 0) {
    return <EmptyState contentType={activeTab} />;
  }

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
        <FeedList
          data={listData}
          renderItem={renderRow}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          extraData={feedExtraData}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[UI_CONFIG.COLORS.PRIMARY]}
              tintColor={UI_CONFIG.COLORS.PRIMARY}
            />
          }
          showsVerticalScrollIndicator={true}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.75}
          // Memory-critical: four keep-alive panes — keep drawDistance modest.
          drawDistance={isFeedActive ? 1600 : 400}
        />
      </View>
    </ContentErrorBoundary>
  );
};
