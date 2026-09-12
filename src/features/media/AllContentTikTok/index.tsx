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
import {
  buildStableFeedMediaList,
  filterContentByType,
  getContentKey,
  getTimeAgo,
  getUserAvatarFromContent,
} from "../../../shared/utils";
import { detectMediaType, isAudioSermon } from "../../../shared/utils/mediaTypeDetection";
import { mapMediaItemToTrack } from "../../../shared/audio/mapToAudioTrack";
import { rememberSessionAudioQueue } from "../../../shared/audio/sessionAudioQueue";
import { useMedia } from "../../../shared/hooks/useMedia";
import { useDefaultContentQuery } from "../../../shared/media/useDefaultContentQuery";
import { filterVisibleMedia } from "../../../shared/media/moderationVisibility";
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

export type { AllContentTikTokProps } from "./types";

function uniqueByMediaId(lists: Array<MediaItem[] | undefined>): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const list of lists) {
    if (!list?.length) continue;
    for (const item of list) {
      const id = String(item?._id || (item as any)?.id || item?.fileUrl || "");
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      if (item) out.push(item);
    }
  }
  return out;
}

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
  const isTypedTab = queryType !== "ALL";
  const tabKind = String(activeTab).toLowerCase();
  const isEbookTab =
    tabKind === "e-books" ||
    tabKind === "ebook" ||
    tabKind === "ebooks" ||
    tabKind === "books";
  const isSermonTab = tabKind === "sermon" || tabKind === "teachings";

  const {
    allContent,
    defaultContent,
    loading,
    error,
    refreshAllContent,
    loadMoreContent,
    isLoadingMore,
    hasMoreDefaultPages,
  } = useMedia({
    /**
     * `/api/media/all-content` only filters videos | music | books | live.
     * `contentType=sermon` is ignored and the API returns normal videos —
     * those used to land on the SERMON chip unfiltered.
     */
    immediate: !isSermonTab,
    contentType: queryType,
    useAuth: useAuthFeed,
  });

  const sharedAll = useMedia({
    immediate: isSermonTab || isEbookTab,
    contentType: "ALL",
    useAuth: useAuthFeed,
  });

  const typedDefault = useDefaultContentQuery({
    enabled: isSermonTab || isEbookTab,
    contentType: isSermonTab ? "sermon" : "books",
  });

  const userDefault = useDefaultContentQuery({
    enabled: isEbookTab,
    contentType: "ALL",
  });

  const queryClient = useQueryClient();
  const handleDeleteSuccess = useCallback(
    (deleted?: MediaItem | { _id?: string; id?: string }) => {
      const id = String(deleted?._id || (deleted as any)?.id || "").trim();
      if (id) {
        removeMediaFromFeedCaches(queryClient, id);
      }
      refreshFeedAfterDelete(queryClient);
      void refreshAllContent();
    },
    [queryClient, refreshAllContent]
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
  });

  useAllContentTikTokSocket(setSocketManager, setRealTimeCounts);

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
    if (!isTypedTab) {
      return filterVisibleMedia(
        buildStableFeedMediaList(defaultContent, allContent),
        currentUserId
      );
    }

    const curated = uniqueByMediaId([
      filterContentByType(allContent, activeTab),
      filterContentByType(defaultContent, activeTab),
      filterContentByType(typedDefault.defaultContent, activeTab),
      isEbookTab
        ? filterContentByType(userDefault.defaultContent, activeTab)
        : [],
      filterContentByType(sharedAll.allContent, activeTab),
      filterContentByType(sharedAll.defaultContent, activeTab),
    ]);
    return filterVisibleMedia(curated, currentUserId);
  }, [
    isTypedTab,
    isEbookTab,
    activeTab,
    allContent,
    defaultContent,
    typedDefault.defaultContent,
    sharedAll.allContent,
    sharedAll.defaultContent,
    userDefault.defaultContent,
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
    refreshAllContent,
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
      if (sharedAll.isLoadingMore || !sharedAll.hasMoreDefaultPages) return;
      void sharedAll.loadMoreContent();
      return;
    }
    if (isLoadingMore || !hasMoreDefaultPages) return;
    loadMoreContent();
  }, [
    isSermonTab,
    sharedAll.isLoadingMore,
    sharedAll.hasMoreDefaultPages,
    sharedAll.loadMoreContent,
    isLoadingMore,
    hasMoreDefaultPages,
    loadMoreContent,
  ]);

  const tabLoading =
    mediaList.length === 0 &&
    (isSermonTab
      ? Boolean(sharedAll.loading || typedDefault.query.isPending)
      : isEbookTab
        ? Boolean(
            loading ||
              typedDefault.query.isPending ||
              userDefault.query.isPending
          )
        : loading);

  if (!isFeedActive) {
    if (filteredMediaList.length === 0) {
      return <View style={{ flex: 1 }} />;
    }
  } else if (error && mediaList.length === 0 && !tabLoading) {
    return <ErrorState message={error} />;
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
    </ContentErrorBoundary>
  );
};
