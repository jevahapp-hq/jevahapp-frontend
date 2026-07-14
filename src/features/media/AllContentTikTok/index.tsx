import { useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  InteractionManager,
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
  detectMediaType,
  getContentKey,
  getTimeAgo,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
  isAudioSermon,
} from "../../../shared/utils";

// Feature-specific imports
import { useQueryClient } from "@tanstack/react-query";
import { useMedia } from "../../../shared/hooks/useMedia";
import { EmptyState, ErrorState, LoadingState } from "./components/ContentFeedStates";
import { ContentItemRenderer } from "./components/ContentItemRenderer";
import { FeedSectionTitle } from "./components/FeedSectionTitle";
import { LiveComingSoonCard } from "./components/LiveComingSoonCard";

import {
  useAllContentTikTokAudio,
  useAllContentTikTokFeedData,
  useAllContentTikTokHandlers,
  useAllContentTikTokSocket,
  useContentStatsHelpers,
} from "./hooks";
// Component imports (app is at project root, sibling to src - need 4 levels up)
import { ContentErrorBoundary } from "../../../../app/components/ContentErrorBoundary";
import SuccessCard from "../../../../app/components/SuccessCard";

// Import original stores and hooks (these will be bridged)
import { useUserProfile } from "../../../../app/hooks/useUserProfile";
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

// A single row in the unified feed list. "Most Recent", "All Content", the
// Live-Streaming promo card, and every media item all live in ONE FlashList
// `data` array now (instead of most-recent/first-four/coming-soon living in
// a separately-mounted ListHeaderComponent). This is what lets us use
// FlashList's own viewability tracking (onViewableItemsChanged) for every
// video - including the ones that used to sit in the header - instead of a
// hand-rolled onScroll + onLayout position calculation, which cannot see
// inside FlashList's virtualized/recycled cells and was the root cause of
// autoplay picking the wrong video (or never firing at all for anything
// below the Coming Soon card).
type FeedRow =
  | { rowType: "section-title"; key: string; title: string }
  | { rowType: "media"; key: string; item: MediaItem; renderIndex: number; mediaSeq: number }
  | { rowType: "coming-soon"; key: string }
  | { rowType: "spacer"; key: string; height: number };

// How many videos are allowed to have a *real* <Video> player mounted at
// once (the visible one + this many neighbours on each side). Android only
// has a handful of hardware video-decoder slots; mounting more players than
// that at the same time is a well-documented cause of some videos showing a
// black frame while their audio still plays. Keeping this small (1) means
// at most 3 real players exist app-wide (active, previous, next).
const PRELOAD_NEIGHBOR_DISTANCE = 1;
// How long to keep a video's <Video> player mounted-but-paused after it
// stops being the active/neighbor item, before actually unmounting it. This
// gives the (already fast, prop-driven) `shouldPlay={false}` pause time to
// actually take effect natively before the view is torn down, which avoids
// the "audio keeps playing for a moment after the picture disappears" glitch
// that a hard, instant unmount caused previously.
const UNMOUNT_GRACE_MS = 1200;

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
    loading,
    error,
    refreshAllContent,
    getFilteredContent,
    hasContent,
  } = useMedia({ immediate: true, contentType: activeTab, useAuth: useAuthFeed });

  const queryClient = useQueryClient();
  const handleDeleteSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["all-content"] });
  }, [queryClient]);

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

  // Merge both sources instead of picking one. `allContent` (the
  // authenticated feed) is always capped at a single page of 20 items and
  // gets refetched on things like deletes, focus, or auth resolving, while
  // `defaultContent` (the public feed) accumulates more items as the user
  // scrolls via pagination. Previously this picked `allContent` outright
  // whenever it had *any* data, so the moment it refetched with its capped
  // 20 items, everything defaultContent had loaded past that (e.g. content
  // under the "Coming Soon" card) would vanish from the list. Merging keeps
  // everything that's already been shown, while still surfacing anything
  // `allContent` has that `defaultContent` doesn't (e.g. the user's own
  // pending uploads).
  const mediaList: MediaItem[] = useMemo(() => {
    if (!Array.isArray(allContent) || allContent.length === 0) {
      return Array.isArray(defaultContent) ? defaultContent : [];
    }
    if (!Array.isArray(defaultContent) || defaultContent.length === 0) {
      return allContent;
    }

    const seen = new Set<string>();
    const merged: MediaItem[] = [];
    for (const item of allContent) {
      const id = item._id || (item as any).id;
      if (id) seen.add(id);
      merged.push(item);
    }
    for (const item of defaultContent) {
      const id = item._id || (item as any).id;
      if (id && seen.has(id)) continue;
      merged.push(item);
    }
    return merged;
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
    contentType: activeTab,
    setPreviouslyViewed,
    setIsLoadingContent,
  });

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
    setRefreshing,
    socketManager,
    toggleLike: toggleLike as any,
    toggleSave: toggleSave as any,
    loadDownloadedItems,
  });

  // no-op: cards used to report their measured position for a hand-rolled
  // scroll/visibility calculation. That's now handled by FlashList's own
  // onViewableItemsChanged below, but ContentItemRenderer still expects an
  // onLayout callback prop.
  const noopLayout = useCallback(() => {}, []);

  const renderContentByType = useCallback(
    (item: MediaItem, index: number, shouldRenderPlayer?: boolean) => (
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
        shouldRenderPlayer={shouldRenderPlayer}
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

  // ---------------------------------------------------------------------
  // Unified row list: "Most Recent" + its item, "All Content" + first four,
  // the Live-Streaming promo card, then everything else. Building this as
  // one array (instead of a ListHeaderComponent + separate `data`) means
  // every video - including the very first ones - is a real FlashList cell
  // that participates in onViewableItemsChanged.
  // ---------------------------------------------------------------------
  const listData: FeedRow[] = useMemo(() => {
    const rows: FeedRow[] = [];
    let mediaSeq = 0;

    if (mostRecentItem) {
      rows.push({ rowType: "section-title", key: "title-most-recent", title: "Most Recent" });
      rows.push({
        rowType: "media",
        key: getContentKey(mostRecentItem) || "most-recent",
        item: mostRecentItem,
        renderIndex: 0,
        mediaSeq: mediaSeq++,
      });
    }

    rows.push({
      rowType: "section-title",
      key: "title-all-content",
      title:
        activeTab === "ALL"
          ? `All Content (${filteredMediaList.length} items)`
          : `${activeTab} Content (${filteredMediaList.length} items)`,
    });

    firstFour.forEach((item, i) => {
      rows.push({
        rowType: "media",
        key: getContentKey(item) || `first-${i}`,
        item,
        renderIndex: i,
        mediaSeq: mediaSeq++,
      });
    });

    if (activeTab === "ALL" || activeTab === "live") {
      rows.push({ rowType: "coming-soon", key: "coming-soon" });
      rows.push({ rowType: "spacer", key: "spacer-after-coming-soon", height: UI_CONFIG.SPACING.XL });
    }

    rest.forEach((item, i) => {
      rows.push({
        rowType: "media",
        key: getContentKey(item) || `rest-${i}`,
        item,
        renderIndex: i + firstFour.length + 1,
        mediaSeq: mediaSeq++,
      });
    });

    rows.push({ rowType: "spacer", key: "spacer-end", height: UI_CONFIG.SPACING.XXL });

    return rows;
  }, [mostRecentItem, firstFour, rest, activeTab, filteredMediaList.length]);

  // Lookup tables derived from listData, kept in refs so the viewability
  // callback (which must stay referentially stable, see below) always sees
  // the latest values without needing to be re-created.
  const mediaSeqByKeyRef = useRef<Record<string, number>>({});
  const mediaKeyBySeqRef = useRef<Record<number, string>>({});
  useEffect(() => {
    const byKey: Record<string, number> = {};
    const bySeq: Record<number, string> = {};
    for (const row of listData) {
      if (row.rowType === "media") {
        byKey[row.key] = row.mediaSeq;
        bySeq[row.mediaSeq] = row.key;
      }
    }
    mediaSeqByKeyRef.current = byKey;
    mediaKeyBySeqRef.current = bySeq;
  }, [listData]);

  // ---------------------------------------------------------------------
  // Viewability tracking (replaces the old onScroll + onLayout math, which
  // cannot see inside FlashList's recycled cells and was the root cause of
  // autoplay firing for the wrong video, or never firing at all below the
  // Coming Soon card).
  // ---------------------------------------------------------------------
  const isAutoPlayEnabledRef = useRef(isAutoPlayEnabled);
  useEffect(() => { isAutoPlayEnabledRef.current = isAutoPlayEnabled; }, [isAutoPlayEnabled]);

  const currentlyVisibleVideoRef = useRef<string | null>(null);
  useEffect(() => { currentlyVisibleVideoRef.current = currentlyVisibleVideo; }, [currentlyVisibleVideo]);

  const playingVideosRef = useRef(playingVideos);
  useEffect(() => { playingVideosRef.current = playingVideos; }, [playingVideos]);

  const playingAudioIdRef = useRef(playingAudioId);
  useEffect(() => { playingAudioIdRef.current = playingAudioId; }, [playingAudioId]);

  const pauseAllAudioRef = useRef(pauseAllAudio);
  useEffect(() => { pauseAllAudioRef.current = pauseAllAudio; }, [pauseAllAudio]);

  const pauseMediaRef = useRef(pauseMedia);
  useEffect(() => { pauseMediaRef.current = pauseMedia; }, [pauseMedia]);

  const playMediaRef = useRef(playMedia);
  useEffect(() => { playMediaRef.current = playMedia; }, [playMedia]);

  const hasDeterminedVisibilityRef = useRef(false);

  const handleViewableItemsChangedImpl = useCallback(
    (info: { viewableItems: Array<{ item: FeedRow; isViewable: boolean }> }) => {
      hasDeterminedVisibilityRef.current = true;

      const viewableKeys = new Set<string>();
      let topVideoKey: string | null = null;

      for (const token of info.viewableItems) {
        const row = token.item;
        if (!row || row.rowType !== "media") continue;
        viewableKeys.add(row.key);
        if (topVideoKey) continue;
        const mediaType = isAudioSermon(row.item) ? "audio" : detectMediaType(row.item);
        if (mediaType === "video") {
          topVideoKey = row.key;
        }
      }

      const prevKey = currentlyVisibleVideoRef.current;
      if (topVideoKey !== prevKey) {
        if (prevKey && playingVideosRef.current[prevKey]) {
          pauseMediaRef.current(prevKey);
        }
        setCurrentlyVisibleVideo(topVideoKey);
        currentlyVisibleVideoRef.current = topVideoKey;
        if (topVideoKey && isAutoPlayEnabledRef.current) {
          playMediaRef.current(topVideoKey, "video");
        }
      }

      // Pause audio that has scrolled out of view (mirrors the old
      // scroll-based "pause if scrolled away" safety net, but driven by the
      // same reliable viewability signal instead of onLayout math).
      const activeAudioKey = playingAudioIdRef.current;
      if (activeAudioKey && !viewableKeys.has(activeAudioKey)) {
        pauseAllAudioRef.current();
      }
    },
    []
  );

  const handleViewableItemsChangedRef = useRef(handleViewableItemsChangedImpl);
  useEffect(() => {
    handleViewableItemsChangedRef.current = handleViewableItemsChangedImpl;
  }, [handleViewableItemsChangedImpl]);

  // Stable identity across renders - FlashList/FlatList warn (and can drop
  // events) if this prop's identity changes, so we forward through a ref.
  const onViewableItemsChanged = useCallback((info: any) => {
    handleViewableItemsChangedRef.current(info);
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 200,
  }).current;

  // ---------------------------------------------------------------------
  // Windowed real-player mounting: only the active video + its immediate
  // neighbours ever mount a real <Video>. Everything else renders a plain
  // placeholder box (no thumbnail, no player) until it's about to become
  // active. This is what actually fixes the "some videos are just a black
  // rectangle with sound" bug - Android can run out of hardware video
  // decoders when too many <Video>/ExoPlayer instances exist at once, and
  // whichever ones lose that race render a black frame while still
  // decoding audio just fine.
  // ---------------------------------------------------------------------
  const [mountedVideoKeys, setMountedVideoKeys] = useState<Set<string>>(() => new Set());
  const unmountTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const seqByKey = mediaSeqByKeyRef.current;
    const keyBySeq = mediaKeyBySeqRef.current;
    const desired = new Set<string>();

    if (currentlyVisibleVideo && seqByKey[currentlyVisibleVideo] !== undefined) {
      const activeSeq = seqByKey[currentlyVisibleVideo];
      desired.add(currentlyVisibleVideo);
      for (let d = 1; d <= PRELOAD_NEIGHBOR_DISTANCE; d++) {
        const before = keyBySeq[activeSeq - d];
        const after = keyBySeq[activeSeq + d];
        if (before) desired.add(before);
        if (after) desired.add(after);
      }
    } else if (!hasDeterminedVisibilityRef.current) {
      // Before the very first viewability callback fires, eagerly mount
      // just the first media row so it's ready to autoplay instantly, same
      // as the previous "mostRecentItem is always eager" behaviour.
      const firstKey = keyBySeq[0];
      if (firstKey) desired.add(firstKey);
    }

    setMountedVideoKeys((prev) => {
      let changed = false;
      const next = new Set(prev);

      desired.forEach((key) => {
        if (!next.has(key)) {
          next.add(key);
          changed = true;
        }
        if (unmountTimersRef.current[key]) {
          clearTimeout(unmountTimersRef.current[key]);
          delete unmountTimersRef.current[key];
        }
      });

      next.forEach((key) => {
        if (!desired.has(key) && !unmountTimersRef.current[key]) {
          unmountTimersRef.current[key] = setTimeout(() => {
            delete unmountTimersRef.current[key];
            setMountedVideoKeys((p) => {
              if (!p.has(key)) return p;
              const n = new Set(p);
              n.delete(key);
              return n;
            });
          }, UNMOUNT_GRACE_MS);
        }
      });

      return changed ? next : prev;
    });
  }, [currentlyVisibleVideo, listData]);

  useEffect(() => {
    return () => {
      Object.values(unmountTimersRef.current).forEach(clearTimeout);
      unmountTimersRef.current = {};
    };
  }, []);

  const getItemType = useCallback((row: FeedRow) => {
    if (row.rowType !== "media") return row.rowType;
    if (isAudioSermon(row.item)) return "media-audio";
    const mediaType = detectMediaType(row.item);
    return mediaType === "video" ? "media-video" : "media-audio";
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
          return renderContentByType(row.item, row.renderIndex, mountedVideoKeys.has(row.key));
        default:
          return null;
      }
    },
    [renderContentByType, mountedVideoKeys]
  );

  const keyExtractor = useCallback((row: FeedRow) => row.key, []);

  if (error && !hasContent) return <ErrorState message={error} />;

  // Show a skeleton while a fetch is in flight instead of flashing
  // "No content available" - this also covers the case where useAuthFeed
  // flips (once auth resolves) and starts a fresh, uncached query under a
  // different cache key, which would otherwise briefly report zero items.
  if (filteredMediaList.length === 0 && loading) {
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
        <FeedList
          data={listData}
          renderItem={renderRow}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[UI_CONFIG.COLORS.PRIMARY]}
              tintColor={UI_CONFIG.COLORS.PRIMARY}
            />
          }
          showsVerticalScrollIndicator={true}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          scrollEventThrottle={16}
          estimatedItemSize={500}
          keyboardShouldPersistTaps="handled"
          overscan={500}
        />
      </View>
    </ContentErrorBoundary>
  );
};
