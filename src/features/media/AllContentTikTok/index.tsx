import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View } from "react-native";

import { ContentType, MediaItem } from "../../../shared/types";
import {
  getContentKey,
  getTimeAgo,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
  isAudioSermon,
} from "../../../shared/utils";

import { AllContentTikTokList } from "./components/AllContentTikTokList";
import { EmptyState, ErrorState, LoadingState } from "./components/ContentFeedStates";
import { ContentItemRenderer } from "./components/ContentItemRenderer";
import {
  useActiveMediaPlayback,
  useAdjacentCommentsPrefetch,
  useAdjacentVideoPrefetch,
  useAllContentTikTokAudio,
  useAllContentTikTokFeedData,
  useAllContentTikTokFeedSource,
  useAllContentTikTokHandlers,
  useAllContentTikTokLifecycle,
  useAllContentTikTokScroll,
  useAllContentTikTokSocket,
  useAllContentTikTokWarmup,
  useContentStatsHelpers,
  useFeedFocusLoop,
} from "./hooks";
import { ContentErrorBoundary } from "../../../../app/components/ContentErrorBoundary";
import SuccessCard from "../../../../app/components/SuccessCard";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
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
  const { isVisible: isCommentSheetOpen } = useCommentModal();

  const {
    mediaList,
    error,
    feedLoading,
    refreshAllContent,
    hasContent,
    loadMoreAllContent,
    hasMorePages,
    isFetchingNextPage,
    handleDeleteSuccess,
  } = useAllContentTikTokFeedSource({ activeTab, useAuthFeed });

  const playMediaGlobally = useGlobalMediaStore((s) => s.playMediaGlobally);
  const pauseVideoAction = useGlobalVideoStore((s) => s.pauseVideo);
  const pauseAllVideosAction = useGlobalVideoStore((s) => s.pauseAllVideos);
  const toggleVideoMuteAction = useGlobalVideoStore((s) => s.toggleVideoMute);

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

  const comments = useInteractionStore((s) => s.comments);
  const { loadDownloadedItems } = useDownloadStore();
  const contentStats = useInteractionStore((s) => s.contentStats);
  const toggleLike = useInteractionStore((s) => s.toggleLike);
  const toggleSave = useInteractionStore((s) => s.toggleSave);
  const recordShare = useInteractionStore((s) => s.recordShare);

  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const toggleModal = useCallback((val: string | null) => {
    setModalVisible(val);
  }, []);
  const [previouslyViewed, setPreviouslyViewed] = useState<any[]>([]);
  const [, setIsLoadingContent] = useState(false);
  const videoRefs = useRef<Record<string, any>>({});
  const [videoVolume] = useState<number>(1.0);
  const [currentlyVisibleVideo, setCurrentlyVisibleVideo] = useState<
    string | null
  >(null);

  const {
    filteredMediaList,
    categorizedContent,
    mostRecentItem,
    firstFour,
    rest,
    reshuffleFeed,
  } = useAllContentTikTokFeedData({
    mediaList,
    contentType: activeTab,
    setPreviouslyViewed,
    setIsLoadingContent,
    previouslyViewed,
  });

  const orderedFeedKeys = useMemo(() => {
    const keys: string[] = [];
    if (mostRecentItem) keys.push(getContentKey(mostRecentItem));
    for (const item of firstFour) keys.push(getContentKey(item));
    for (const item of rest) keys.push(getContentKey(item));
    return keys;
  }, [mostRecentItem, firstFour, rest]);

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
  }, [currentlyVisibleVideo, filteredMediaList]);

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

  useAllContentTikTokWarmup(filteredMediaList);

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

  useAllContentTikTokLifecycle({
    pauseAllMedia,
    pauseAllAudio,
    setCurrentlyVisibleVideo,
  });

  const {
    setListHostRef,
    registerFocusTarget,
    onScrollForFocus,
    evaluateFocus,
  } = useFeedFocusLoop({
    enabled: isAutoPlayEnabled && !isCommentSheetOpen,
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
    reshuffleFeed,
    setRefreshing,
    toggleLike: toggleLike as any,
    toggleSave: toggleSave as any,
    recordShare: recordShare as any,
    loadDownloadedItems,
  });

  const onEndReached = useCallback(() => {
    if (!hasMorePages || isFetchingNextPage) return;
    void loadMoreAllContent?.();
  }, [hasMorePages, isFetchingNextPage, loadMoreAllContent]);

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

  // Silence unused vars kept for parity with prior playback wiring
  void currentlyPlayingVideo;
  void videoRefs;

  if (error && !hasContent) return <ErrorState message={error} />;
  if (feedLoading && filteredMediaList.length === 0) {
    return <LoadingState count={2} />;
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
        <AllContentTikTokList
          activeTab={activeTab}
          rest={rest}
          mostRecentItem={mostRecentItem ?? null}
          firstFour={firstFour}
          filteredMediaListLength={filteredMediaList.length}
          currentlyVisibleVideo={currentlyVisibleVideo}
          getContentKey={getContentKey}
          renderContentByType={renderContentByType}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onScroll={handleScroll}
          onScrollEnd={handleScrollEnd}
          setListHostRef={setListHostRef}
          onEndReached={onEndReached}
          isFetchingNextPage={isFetchingNextPage}
          scrollEnabled={!isCommentSheetOpen}
        />
      </View>
    </ContentErrorBoundary>
  );
};
