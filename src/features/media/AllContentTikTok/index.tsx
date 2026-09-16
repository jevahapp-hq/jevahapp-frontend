import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { MediaItem } from "../../../shared/types";
import { buildStableFeedMediaList } from "../../../shared/utils/buildStableFeedMediaList";
import {
  getContentKey,
  getTimeAgo,
  getUserAvatarFromContent,
} from "../../../shared/utils/contentHelpers";
import { detectMediaType, isAudioSermon } from "../../../shared/utils/mediaTypeDetection";
import { mapMediaItemToTrack } from "../../../shared/audio/mapToAudioTrack";
import {
  rememberSessionAudioQueue,
  rememberSermonAudioQueue,
} from "../../../shared/audio/sessionAudioQueue";
import { ensurePlayingTrack } from "../../../shared/audio/playOrToggleTrack";
import { useMedia } from "../../../shared/hooks/useMedia";
import { useTypedCatalogInfiniteQuery } from "../../../shared/media/useTypedCatalogInfiniteQuery";
import { rememberHomeFeedCategory } from "../../../shared/media/homeFeedCategory";
import { filterVisibleMedia } from "../../../shared/media/moderationVisibility";
import { weaveCatalogIntoFeed } from "../../../shared/utils/weaveCatalogIntoFeed";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { feedQueryContentType } from "./hooks/useAllContentTikTokFeedSource";
import {
  refreshFeedAfterDelete,
  removeMediaFromFeedCaches,
} from "../../../shared/utils/removeMediaFromFeedCaches";
import { EmptyState, ErrorState, LoadingState } from "./components/ContentFeedStates";
import { ContentItemRenderer } from "./components/ContentItemRenderer";
import { AllContentTikTokList } from "./components/AllContentTikTokList";
import { FEED_HARD_MAX_PLAYERS, findMediaRowIndex, getFeedVideoRowSize } from "../video-feed";
import {
  useAdjacentCommentsPrefetch,
  useAdjacentVideoPrefetch,
  useAllContentTikTokAudio,
  useAllContentTikTokFeedData,
  useAllContentTikTokHandlers,
  useAllContentTikTokSocket,
  useAllContentTikTokWarmup,
  useComingSoonBackfill,
  useContentStatsHelpers,
  useFeedAuthorDisplay,
  useFeedPlaybackSession,
  useFeedPlayerMounts,
  useFeedViewability,
  useAllContentTikTokLifecycle,
} from "./hooks";
import { ContentErrorBoundary } from "../../../../app/components/ContentErrorBoundary";
import SuccessCard from "../../../../app/components/SuccessCard";
import { useUserProfile } from "../../../../app/hooks/useUserProfile";
import { useAuthorStoreVersion } from "../../../shared/author";
import SocketManager from "../../../../app/services/SocketManager";
import { useDownloadStore } from "@/store/useDownloadStore";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { useInteractionStore } from "@/store/useInteractionStore";
import { useReelsStore } from "@/store/useReelsStore";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import {
  getLiteListWindow,
  getLitePlayerNeighborRadius,
  isLiteProfileActive,
  shouldPrefetchFeedComments,
} from "../../../shared/lite/liteProfile";
import type { AllContentTikTokProps, FeedRow } from "./types";
import { buildFeedRows, indexMediaRows } from "./utils/buildFeedRows";
import { scrollFeedToResume } from "./utils/scrollFeedToResume";
import { warmVideoConnection } from "./utils/videoConnectionWarmer";

export type { AllContentTikTokProps } from "./types";

export const AllContentTikTok: React.FC<AllContentTikTokProps> = ({
  contentType: activeTab = "ALL",
  useAuthFeed = false,
  isFeedActive = true,
  keepVideoDecoders = false,
}) => {
  const { user } = useUserProfile();
  const authorStoreVersion = useAuthorStoreVersion();
  const { currentUserId, resolveDisplayName } = useFeedAuthorDisplay(
    user,
    authorStoreVersion
  );
  const liteActive = isLiteProfileActive();
  const listWindow = getLiteListWindow();
  const maxPlayers = FEED_HARD_MAX_PLAYERS;
  const queryType = feedQueryContentType(activeTab);
  const tabKind = String(activeTab).toLowerCase();
  const isEbookTab =
    tabKind === "e-books" ||
    tabKind === "ebook" ||
    tabKind === "ebooks" ||
    tabKind === "books";
  const isSermonTab = tabKind === "sermon" || tabKind === "teachings";
  const isCatalogTab = isSermonTab || isEbookTab;
  const isAllTab = tabKind === "all";

  const {
    allContent,
    defaultContent,
    loading,
    error: discoveryError,
    refreshAllContent,
    loadMoreContent,
    isLoadingMore,
    hasMoreDefaultPages,
  } = useMedia({
    immediate: !isCatalogTab,
    contentType: isCatalogTab ? "ALL" : queryType,
    useAuth: useAuthFeed,
  });

  const sermonCatalog = useTypedCatalogInfiniteQuery({
    kind: "sermon",
    enabled: isSermonTab || isAllTab,
  });
  const ebookCatalog = useTypedCatalogInfiniteQuery({
    kind: "ebook",
    enabled: isEbookTab || isAllTab,
  });

  const queryClient = useQueryClient();
  const handleDeleteSuccess = useCallback(
    (deleted?: MediaItem | { _id?: string; id?: string }) => {
      const id = String(deleted?._id || (deleted as any)?.id || "").trim();
      if (id) {
        removeMediaFromFeedCaches(queryClient, id);
      }
      refreshFeedAfterDelete(queryClient);
      if (isSermonTab) {
        void sermonCatalog.refetch();
        return;
      }
      if (isEbookTab) {
        void ebookCatalog.refetch();
        return;
      }
      void refreshAllContent();
      if (isAllTab) {
        void sermonCatalog.refetch();
        void ebookCatalog.refetch();
      }
    },
    [
      queryClient,
      refreshAllContent,
      isSermonTab,
      isEbookTab,
      isAllTab,
      sermonCatalog.refetch,
      ebookCatalog.refetch,
    ]
  );

  const { isVisible: commentsVisible, isClosing: commentsClosing } =
    useCommentModal();
  const commentsOpen = commentsVisible || commentsClosing;
  const commentsOpenRef = useRef(commentsOpen);
  useEffect(() => {
    commentsOpenRef.current = commentsOpen;
  }, [commentsOpen]);

  const {
    playingAudioId,
    playAudio,
    pauseAllAudio,
  } = useAllContentTikTokAudio();

  const currentlyVisibleVideoRef = useRef<string | null>(null);
  const listRef = useRef<any>(null);
  const listDataRef = useRef<FeedRow[]>([]);
  const pendingResumeKeyRef = useRef<string | null>(null);
  const {
    playMedia,
    pauseMedia,
    pauseAllMedia,
    toggleVideoMute,
    currentlyPlayingVideo,
    isAutoPlayEnabled,
    isFeedActiveRef,
    isAutoPlayEnabledRef,
  } = useFeedPlaybackSession({
    isFeedActive,
    currentlyVisibleVideoRef,
    pauseAllAudio,
  });

  const { comments } = useInteractionStore();
  const { loadDownloadedItems } = useDownloadStore();
  const { contentStats, toggleLike, toggleSave } = useInteractionStore();

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const toggleModal = useCallback((val: string | null) => {
    setModalVisible(val);
  }, []);
  const [previouslyViewed, setPreviouslyViewed] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [socketManager, setSocketManager] = useState<SocketManager | null>(null);
  const [realTimeCounts, setRealTimeCounts] = useState<Record<string, any>>({});
  const [videoVolume] = useState<number>(1.0);
  const [currentlyVisibleVideo, setCurrentlyVisibleVideo] = useState<string | null>(null);
  const [focusedFeedKey, setFocusedFeedKey] = useState<string | null>(null);

  useEffect(() => {
    currentlyVisibleVideoRef.current = currentlyVisibleVideo;
    useGlobalVideoStore.setState({ currentlyVisibleVideo });
  }, [currentlyVisibleVideo]);

  useEffect(() => {
    if (commentsVisible && currentlyVisibleVideo) {
      pendingResumeKeyRef.current = currentlyVisibleVideo;
    }
  }, [commentsVisible, currentlyVisibleVideo]);

  useAllContentTikTokLifecycle({
    pauseAllMedia,
    pauseAllAudio,
    setCurrentlyVisibleVideo,
    currentlyVisibleVideoRef,
    listRef,
    listDataRef,
    pendingResumeKeyRef,
    isFeedActive,
  });

  useAllContentTikTokSocket(setSocketManager, setRealTimeCounts);

  useEffect(() => {
    if (!isFeedActive) return;
    rememberHomeFeedCategory(String(activeTab || "ALL"));
  }, [isFeedActive, activeTab]);

  /**
   * Feed visibility chokepoint. Unapproved content (`under_review`, `pending`,
   * `rejected`, or a missing status) is dropped for everyone except its
   * uploader, who keeps seeing it so they can delete it.
   *
   * Filtering here rather than per-card means tab filtering, row building and
   * the "most recent" hero all inherit it. It has to happen on *read* because
   * `prependMediaToFeedCaches` writes a fresh upload into every cache key,
   * including the shared public seed.
   */
  const mediaList: MediaItem[] = useMemo(() => {
    if (isSermonTab) {
      return filterVisibleMedia(sermonCatalog.items, currentUserId);
    }
    if (isEbookTab) {
      return filterVisibleMedia(ebookCatalog.items, currentUserId);
    }
    const discovery = buildStableFeedMediaList(defaultContent, allContent);
    const mixed = isAllTab
      ? weaveCatalogIntoFeed(discovery, [
          ...sermonCatalog.items,
          ...ebookCatalog.items,
        ])
      : discovery;
    return filterVisibleMedia(mixed, currentUserId);
  }, [
    isSermonTab,
    isEbookTab,
    isAllTab,
    sermonCatalog.items,
    ebookCatalog.items,
    allContent,
    defaultContent,
    currentUserId,
  ]);

  const {
    filteredMediaList,
    categorizedContent,
    mostRecentItem,
    firstFour,
    rest,
  } = useAllContentTikTokFeedData({
    mediaList,
    contentType: activeTab,
    skipTypeFilter: isCatalogTab || isAllTab,
    setPreviouslyViewed,
    setIsLoadingContent,
  });

  useEffect(() => {
    const tracks = filteredMediaList
      .filter(
        (item) => detectMediaType(item) === "audio" || isAudioSermon(item)
      )
      .map((item) => mapMediaItemToTrack(item, "feed"))
      .filter((t): t is NonNullable<typeof t> => !!t);
    rememberSessionAudioQueue(tracks);
    rememberSermonAudioQueue(
      filteredMediaList
        .filter((item) => isAudioSermon(item))
        .map((item) => mapMediaItemToTrack(item, "feed"))
        .filter((t): t is NonNullable<typeof t> => !!t)
    );
  }, [filteredMediaList]);

  const {
    getUserLikeState,
    getLikeCount,
    getUserSaveState,
    getCommentCount,
  } = useContentStatsHelpers(contentStats);

  const getFeedPlaybackKey = useCallback(
    (item: MediaItem) => `${activeTab}::${getContentKey(item)}`,
    [activeTab]
  );

  useAllContentTikTokWarmup(filteredMediaList, isFeedActive);
  useAdjacentVideoPrefetch({
    focusedKey: currentlyVisibleVideo,
    items: filteredMediaList,
    getContentKey: getFeedPlaybackKey,
    ahead: liteActive ? 1 : 2,
  });
  useAdjacentCommentsPrefetch({
    focusedKey: shouldPrefetchFeedComments()
      ? focusedFeedKey || currentlyVisibleVideo
      : null,
    items: filteredMediaList,
    getContentKey: getFeedPlaybackKey,
    radius: getLitePlayerNeighborRadius(),
    idleOnly: true,
  });

  const refreshFeed = useCallback(async () => {
    if (isSermonTab) {
      await sermonCatalog.refetch();
      return;
    }
    if (isEbookTab) {
      await ebookCatalog.refetch();
      return;
    }
    await refreshAllContent();
    if (isAllTab) {
      void sermonCatalog.refetch();
      void ebookCatalog.refetch();
    }
  }, [
    isSermonTab,
    isEbookTab,
    isAllTab,
    sermonCatalog.refetch,
    ebookCatalog.refetch,
    refreshAllContent,
  ]);

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
    mostRecentItem,
    firstFour,
    rest,
    contentStats,
    getContentKey,
    getFeedPlaybackKey,
    getTimeAgo,
    getLikeCount,
    getCommentCount,
    getUserSaveState,
    playingAudioId,
    playMedia,
    pauseMedia,
    pauseAllAudio,
    setModalVisible,
    setSuccessMessage,
    setShowSuccessCard,
    setCurrentlyVisibleVideo,
    refreshAllContent: refreshFeed,
    setRefreshing,
    socketManager,
    toggleLike: toggleLike as any,
    toggleSave: toggleSave as any,
    loadDownloadedItems,
  });

  const noopLayout = useCallback(() => {}, []);

  const renderContentByType = useCallback(
    (item: MediaItem, index: number, shouldRenderPlayer?: boolean) => (
      <ContentItemRenderer
        item={item}
        index={index}
        getContentKey={getContentKey}
        getPlaybackKey={getFeedPlaybackKey}
        getUserLikeState={getUserLikeState}
        getLikeCount={getLikeCount}
        contentStats={contentStats}
        videoVolume={videoVolume}
        currentlyVisibleVideo={currentlyVisibleVideo}
        playingAudioId={playingAudioId}
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
        getUserDisplayNameFromContent={resolveDisplayName}
        getUserAvatarFromContent={getUserAvatarFromContent}
        isAutoPlayEnabled={isAutoPlayEnabled}
        currentUserId={currentUserId}
        shouldRenderPlayer={shouldRenderPlayer}
        isFeedActive={isFeedActive}
      />
    ),
    [
      getUserLikeState,
      getLikeCount,
      contentStats,
      videoVolume,
      currentlyVisibleVideo,
      playingAudioId,
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
      resolveDisplayName,
    ]
  );

  const listData = useMemo(
    () =>
      buildFeedRows({
        mostRecentItem,
        firstFour,
        rest,
        activeTab,
        filteredCount: filteredMediaList.length,
        getFeedPlaybackKey,
        liteActive,
      }),
    [
      mostRecentItem,
      firstFour,
      rest,
      activeTab,
      filteredMediaList.length,
      getFeedPlaybackKey,
      liteActive,
    ]
  );
  listDataRef.current = listData;

  const mediaSeqByKeyRef = useRef<Record<string, number>>({});
  const mediaKeyBySeqRef = useRef<Record<number, string>>({});
  const mediaItemBySeqRef = useRef<Record<number, MediaItem>>({});
  useEffect(() => {
    const indexed = indexMediaRows(listData);
    mediaSeqByKeyRef.current = indexed.byKey;
    mediaKeyBySeqRef.current = indexed.bySeq;
    mediaItemBySeqRef.current = indexed.itemBySeq;
    listDataRef.current = listData;
    const pending = pendingResumeKeyRef.current;
    if (!pending) return;
    const resume = useReelsStore.getState().resumePlayback;
    const index = findMediaRowIndex(listData, pending, resume?.contentId);
    if (index < 0) return;
    requestAnimationFrame(() => {
      scrollFeedToResume(listRef, listData, index);
    });
  }, [listData]);

  const playAudioSermon = useCallback(
    (item: MediaItem) => {
      const track = mapMediaItemToTrack(item, "feed");
      if (!track) return;
      const queue = filteredMediaList
        .filter((row) => isAudioSermon(row))
        .map((row) => mapMediaItemToTrack(row, "feed"))
        .filter((t): t is NonNullable<typeof t> => !!t);
      void ensurePlayingTrack(track, { queue });
      const idx = queue.findIndex((t) => t.id === track.id);
      const upcoming = idx >= 0 ? queue[idx + 1] : undefined;
      if (upcoming?.audioUrl) {
        warmVideoConnection(upcoming.audioUrl);
      }
      const overlay = useCopyrightFreeOverlayStore.getState();
      if (overlay.surface !== "full") return;
      const thumb = item.imageUrl || item.thumbnailUrl;
      overlay.setSong({
        ...track,
        _id: track.id,
        fileUrl: track.audioUrl,
        thumbnailUrl:
          typeof thumb === "string"
            ? thumb
            : (thumb as { uri?: string })?.uri || track.thumbnailUrl,
        contentType: item.contentType || "sermon",
        source: "feed",
      });
      overlay.setQueue(
        queue.map((t) => ({
          id: t.id,
          _id: t.id,
          title: t.title,
          artist: t.artist,
          thumbnailUrl: t.thumbnailUrl,
          audioUrl: t.audioUrl,
          duration: t.duration,
          source: t.source,
        }))
      );
    },
    [filteredMediaList]
  );

  const { hasDeterminedVisibilityRef, viewabilityConfigCallbackPairs } =
    useFeedViewability({
      isFeedActiveRef,
      commentsOpenRef,
      currentlyVisibleVideoRef,
      isAutoPlayEnabledRef,
      playingAudioId,
      pauseAllAudio,
      pauseMedia,
      playMedia,
      playAudioSermon,
      setCurrentlyVisibleVideo,
      setFocusedFeedKey,
      pendingResumeKeyRef,
    });

  const { mountedVideoKeys } = useFeedPlayerMounts({
    listData,
    currentlyVisibleVideo,
    isFeedActive,
    keepVideoDecoders,
    liteActive,
    maxPlayers,
    hasDeterminedVisibilityRef,
    mediaSeqByKeyRef,
    mediaKeyBySeqRef,
    mediaItemBySeqRef,
  });

  useComingSoonBackfill({
    liteActive,
    activeTab,
    restLength: rest.length,
    filteredCount: filteredMediaList.length,
    hasMoreDefaultPages,
    isLoadingMore,
    loadMoreContent,
  });

  const handleEndReached = useCallback(() => {
    if (isSermonTab) {
      if (sermonCatalog.isFetchingNextPage || !sermonCatalog.hasNextPage) return;
      void sermonCatalog.fetchNextPage();
      return;
    }
    if (isEbookTab) {
      if (ebookCatalog.isFetchingNextPage || !ebookCatalog.hasNextPage) return;
      void ebookCatalog.fetchNextPage();
      return;
    }
    if (isLoadingMore || !hasMoreDefaultPages) return;
    loadMoreContent();
    if (isAllTab) {
      if (sermonCatalog.hasNextPage && !sermonCatalog.isFetchingNextPage) {
        void sermonCatalog.fetchNextPage();
      }
      if (ebookCatalog.hasNextPage && !ebookCatalog.isFetchingNextPage) {
        void ebookCatalog.fetchNextPage();
      }
    }
  }, [
    isSermonTab,
    isEbookTab,
    isAllTab,
    sermonCatalog.isFetchingNextPage,
    sermonCatalog.hasNextPage,
    sermonCatalog.fetchNextPage,
    ebookCatalog.isFetchingNextPage,
    ebookCatalog.hasNextPage,
    ebookCatalog.fetchNextPage,
    isLoadingMore,
    hasMoreDefaultPages,
    loadMoreContent,
  ]);

  const error = isSermonTab
    ? sermonCatalog.error
    : isEbookTab
      ? ebookCatalog.error
      : discoveryError && !String(discoveryError).includes("Missing queryFn")
        ? discoveryError
        : null;

  const tabLoading =
    mediaList.length === 0 &&
    (isSermonTab
      ? sermonCatalog.isPending
      : isEbookTab
        ? ebookCatalog.isPending
        : loading);

  const resumeTarget = useReelsStore.getState().resumePlayback?.target;
  const resumingFromFullscreen =
    resumeTarget === "feed" || resumeTarget === "reels";

  if (!isFeedActive) {
    if (filteredMediaList.length === 0) {
      return <View style={{ flex: 1 }} />;
    }
  } else if (error && mediaList.length === 0 && !tabLoading) {
    return <ErrorState message={error} />;
  }

  // Returning from fullscreen must not swap a live feed for the skeleton
  // (black → loading → white). Keep the host empty until cached rows exist.
  if (filteredMediaList.length === 0 && resumingFromFullscreen) {
    return <View style={{ flex: 1 }} />;
  }

  if (isFeedActive && filteredMediaList.length === 0 && tabLoading) {
    return <LoadingState />;
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
        <View style={{ flex: 1 }}>
        <AllContentTikTokList
          listRef={listRef}
          listData={listData}
          mountedVideoKeys={mountedVideoKeys}
          currentlyVisibleVideo={currentlyVisibleVideo}
          currentlyPlayingVideo={currentlyPlayingVideo}
          isFeedActive={isFeedActive}
          authorStoreVersion={authorStoreVersion}
          commentsOpen={commentsOpen}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          estimatedItemSize={listWindow.estimatedItemSize || getFeedVideoRowSize()}
          liteActive={liteActive}
          drawDistance={listWindow.drawDistance}
          onEndReached={handleEndReached}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
          renderContentByType={renderContentByType}
        />
        </View>
      </View>
    </ContentErrorBoundary>
  );
};
