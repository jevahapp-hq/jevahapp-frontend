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
  buildStableFeedMediaList,
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
import { feedQueryContentType } from "./hooks/useAllContentTikTokFeedSource";
import { EmptyState, ErrorState, LoadingState } from "./components/ContentFeedStates";
import { ContentItemRenderer } from "./components/ContentItemRenderer";
import { FeedSectionTitle } from "./components/FeedSectionTitle";
import { LiveComingSoonCard } from "./components/LiveComingSoonCard";
import { warmVideoConnection } from "./utils/videoConnectionWarmer";
import { getBestVideoUrl, getVideoUrlFromMedia } from "../../../shared/utils/videoUrlManager";
import {
  FEED_HARD_MAX_PLAYERS,
  FEED_INITIAL_MOUNT_COUNT,
  FEED_PRELOAD_NEIGHBOR_DISTANCE,
  FEED_PRELOAD_WARM_DISTANCE,
  FEED_VIDEO_MIN_VIEW_MS,
  FEED_VIDEO_ROW_SIZE,
  FEED_VIDEO_VISIBLE_PERCENT,
  FEED_WARM_IDLE_MOUNT_COUNT,
} from "../video-feed";

import {
  useAdjacentCommentsPrefetch,
  useAdjacentVideoPrefetch,
  useAllContentTikTokAudio,
  useAllContentTikTokFeedData,
  useAllContentTikTokHandlers,
  useAllContentTikTokSocket,
  useAllContentTikTokWarmup,
  useContentStatsHelpers,
} from "./hooks";
// Component imports (app is at project root, sibling to src - need 4 levels up)
import { ContentErrorBoundary } from "../../../../app/components/ContentErrorBoundary";
import SuccessCard from "../../../../app/components/SuccessCard";

// Import original stores and hooks (these will be bridged)
import { useUserProfile } from "../../../../app/hooks/useUserProfile";
import { UserProfileCache } from "../../../../app/utils/cache/UserProfileCache";
import { extractAuthorId, seedAuthorFromSession, clearAuthorFetchFailures, useAuthorStoreVersion } from "../../../shared/author";
import SocketManager from "../../../../app/services/SocketManager";
import { useDownloadStore } from "../../../../app/store/useDownloadStore";
import { useGlobalVideoStore } from "../../../../app/store/useGlobalVideoStore";
import { useInteractionStore } from "../../../../app/store/useInteractionStore";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import {
  getLiteListWindow,
  getLitePlayerNeighborRadius,
  isLiteProfileActive,
  shouldMountLitePlayer,
} from "../../../shared/lite/liteProfile";

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

/**
 * Soft ceiling is enforced by pruning oldest mounts (see mount effect).
 * Exceeding hardware decoder limits hangs Android / freezes iOS.
 */

export const AllContentTikTok: React.FC<AllContentTikTokProps> = ({
  contentType: activeTab = "ALL",
  useAuthFeed = false,
  isFeedActive = true,
  keepVideoDecoders = false,
}) => {
  const { user } = useUserProfile();
  const currentUserId = user?._id || user?.id || null;
  const authorStoreVersion = useAuthorStoreVersion();
  const liteActive = isLiteProfileActive();
  const listWindow = getLiteListWindow();
  const maxPlayers = liteActive ? 2 : FEED_HARD_MAX_PLAYERS;

  const resolveDisplayName = useCallback(
    (item?: MediaItem | null) => {
      if (!item) return "Anonymous User";
      const name = getUserDisplayNameFromContent(item);
      if (name && !/^(anonymous(\s+user)?|unknown)$/i.test(name.trim())) {
        return name;
      }
      const authorId = extractAuthorId(item) || "";
      if (
        currentUserId &&
        authorId &&
        String(currentUserId) === authorId &&
        user
      ) {
        const mine = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        if (mine) return mine;
        if (user.email) return String(user.email).split("@")[0];
      }
      return name;
    },
    [currentUserId, user, authorStoreVersion]
  );

  useEffect(() => {
    if (!currentUserId || !user) return;
    const payload = {
      _id: String(currentUserId),
      id: String(currentUserId),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      avatar: (user.avatar || user.avatarUpload || "") as string,
      avatarUpload: (user.avatarUpload || user.avatar || "") as string,
      email: user.email || "",
    };
    UserProfileCache.cacheUserProfile(String(currentUserId), payload as any);
    seedAuthorFromSession(payload);
    clearAuthorFetchFailures();
  }, [currentUserId, user]);

  // Media data from the new hook (useAuthFeed so newly uploaded content appears when logged in)
  const {
    allContent,
    defaultContent,
    loading,
    defaultContentLoading,
    error,
    refreshAllContent,
    loadMoreContent,
    isLoadingMore,
    hasMoreDefaultPages,
    getFilteredContent,
    hasContent,
  } = useMedia({
    immediate: true,
    contentType: feedQueryContentType(activeTab),
    useAuth: useAuthFeed,
  });

  const queryClient = useQueryClient();
  const handleDeleteSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["all-content"] });
  }, [queryClient]);

  // Get global video state - FIX: Read from the same store we write to with REACTIVE SUBSCRIPTIONS
  // Using specific selectors for stability
  const pauseVideoAction = useGlobalVideoStore((s) => s.pauseVideo);
  const pauseAllVideosAction = useGlobalVideoStore((s) => s.pauseAllVideos);
  const toggleVideoMuteAction = useGlobalVideoStore((s) => s.toggleVideoMute);
  const enableAutoPlayAction = useGlobalVideoStore((s) => s.enableAutoPlay);
  const playVideoGlobally = useGlobalVideoStore((s) => s.playVideoGlobally);
  const currentlyPlayingVideo = useGlobalVideoStore(
    (s) => s.currentlyPlayingVideo
  );
  const isAutoPlayEnabled = useGlobalVideoStore((s) => s.isAutoPlayEnabled);
  const { isVisible: commentsOpen } = useCommentModal();

  const playMedia = useCallback((key: string, type: "video" | "audio") => {
    if (type === "video") {
      playVideoGlobally(key);
    }
  }, [playVideoGlobally]);

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
  } = useAllContentTikTokAudio();

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
  const currentlyVisibleVideoRef = useRef<string | null>(null);
  const [focusedFeedKey, setFocusedFeedKey] = useState<string | null>(null);
  const isFeedActiveRef = useRef(isFeedActive);
  const isAutoPlayEnabledRef = useRef(isAutoPlayEnabled);
  const commentsOpenRef = useRef(commentsOpen);
  const wasFeedActiveRef = useRef(isFeedActive);

  useEffect(() => {
    currentlyVisibleVideoRef.current = currentlyVisibleVideo;
    useGlobalVideoStore.setState({ currentlyVisibleVideo });
  }, [currentlyVisibleVideo]);
  useEffect(() => {
    isFeedActiveRef.current = isFeedActive;
  }, [isFeedActive]);
  useEffect(() => {
    isAutoPlayEnabledRef.current = isAutoPlayEnabled;
  }, [isAutoPlayEnabled]);
  useEffect(() => {
    commentsOpenRef.current = commentsOpen;
  }, [commentsOpen]);

  useAllContentTikTokSocket(setSocketManager, setRealTimeCounts);

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
  // Paginated defaultContent is the stable backbone (Coming Soon `rest`).
  // Auth-only uploads are prepended without replacing that list.
  const mediaList: MediaItem[] = useMemo(
    () => buildStableFeedMediaList(defaultContent, allContent),
    [allContent, defaultContent]
  );

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

  /** Unique per feed tab — stops ALL/VIDEO/SERMON from playing the same clip twice. */
  const getFeedPlaybackKey = useCallback(
    (item: MediaItem) => `${activeTab}::${getContentKey(item)}`,
    [activeTab, getContentKey]
  );

  useAllContentTikTokWarmup(filteredMediaList);
  useAdjacentVideoPrefetch({
    focusedKey: currentlyVisibleVideo,
    items: filteredMediaList,
    getContentKey: getFeedPlaybackKey,
    ahead: liteActive ? 1 : 2,
  });
  useAdjacentCommentsPrefetch({
    focusedKey: focusedFeedKey || currentlyVisibleVideo,
    items: filteredMediaList,
    getContentKey: getFeedPlaybackKey,
    radius: getLitePlayerNeighborRadius(),
    idleOnly: false,
  });

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
        getPlaybackKey={getFeedPlaybackKey}
        getUserLikeState={getUserLikeState}
        getLikeCount={getLikeCount}
        contentStats={contentStats}
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
      resolveDisplayName,
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

  // Pause only when the app backgrounds. Do NOT clear currentlyVisibleVideo
  // on route blur — bottom-tab switches keep Home mounted (opacity hide),
  // and clearing visibility forced a cold re-pick that looked like a refresh.
  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next !== "active") {
        if (!isFeedActiveRef.current) return;
        try {
          pauseAllMedia();
        } catch { }
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

  // When this category pane is hidden: pause so audio doesn't bleed.
  // When it becomes active again: resume the same visible video in place.
  useEffect(() => {
    if (!isFeedActive) {
      if (wasFeedActiveRef.current) {
        try {
          pauseAllMedia();
        } catch { }
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
    // Duplicate FlashList keys silently drop rows — that wiped content
    // under Coming Soon whenever getContentKey collided.
    const usedKeys = new Set<string>();
    const uniqueKey = (base: string, fallback: string) => {
      let key = base || fallback;
      if (!key || usedKeys.has(key)) {
        key = `${fallback}-${mediaSeq}`;
      }
      usedKeys.add(key);
      return key;
    };

    if (mostRecentItem) {
      rows.push({ rowType: "section-title", key: "title-most-recent", title: "Most Recent" });
      rows.push({
        rowType: "media",
        key: uniqueKey(getFeedPlaybackKey(mostRecentItem), "most-recent"),
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
        key: uniqueKey(getFeedPlaybackKey(item), `first-${i}`),
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
        key: uniqueKey(getFeedPlaybackKey(item), `rest-${i}`),
        item,
        renderIndex: i + firstFour.length + 1,
        mediaSeq: mediaSeq++,
      });
    });

    rows.push({ rowType: "spacer", key: "spacer-end", height: UI_CONFIG.SPACING.XXL });

    return rows;
  }, [mostRecentItem, firstFour, rest, activeTab, filteredMediaList.length, getFeedPlaybackKey]);

  // Lookup tables derived from listData, kept in refs so the viewability
  // callback (which must stay referentially stable, see below) always sees
  // the latest values without needing to be re-created.
  const mediaSeqByKeyRef = useRef<Record<string, number>>({});
  const mediaKeyBySeqRef = useRef<Record<number, string>>({});
  const mediaItemBySeqRef = useRef<Record<number, MediaItem>>({});
  useEffect(() => {
    const byKey: Record<string, number> = {};
    const bySeq: Record<number, string> = {};
    const itemBySeq: Record<number, MediaItem> = {};
    for (const row of listData) {
      if (row.rowType === "media") {
        byKey[row.key] = row.mediaSeq;
        bySeq[row.mediaSeq] = row.key;
        itemBySeq[row.mediaSeq] = row.item;
      }
    }
    mediaSeqByKeyRef.current = byKey;
    mediaKeyBySeqRef.current = bySeq;
    mediaItemBySeqRef.current = itemBySeq;
  }, [listData]);

  // Cheap, decoder-free "warm the connection" pass for videos a bit further
  // out than we'd ever mount a real player for (see PRELOAD_WARM_DISTANCE).
  // By the time one of these becomes the active/neighbor item and a real
  // <Video> mounts, DNS/TLS/CDN routing for its URL has already been done,
  // which is most of what actually causes the multi-second black gap before
  // a video's first frame paints.
  const warmSeqRange = useCallback((centerSeq: number, distance: number) => {
    for (let d = -distance; d <= distance; d++) {
      const item = mediaItemBySeqRef.current[centerSeq + d];
      if (!item) continue;
      if (isAudioSermon(item) || detectMediaType(item) !== "video") continue;
      const rawUrl = getVideoUrlFromMedia(item);
      if (!rawUrl) continue;
      warmVideoConnection(getBestVideoUrl(rawUrl));
    }
  }, []);

  // ---------------------------------------------------------------------
  // Viewability tracking (replaces the old onScroll + onLayout math, which
  // cannot see inside FlashList's recycled cells and was the root cause of
  // autoplay firing for the wrong video, or never firing at all below the
  // Coming Soon card).
  // ---------------------------------------------------------------------
  const playingAudioIdRef = useRef(playingAudioId);
  useEffect(() => { playingAudioIdRef.current = playingAudioId; }, [playingAudioId]);

  const pauseAllAudioRef = useRef(pauseAllAudio);
  useEffect(() => { pauseAllAudioRef.current = pauseAllAudio; }, [pauseAllAudio]);

  const pauseMediaRef = useRef(pauseMedia);
  useEffect(() => { pauseMediaRef.current = pauseMedia; }, [pauseMedia]);

  const playMediaRef = useRef(playMedia);
  useEffect(() => { playMediaRef.current = playMedia; }, [playMedia]);

  const hasDeterminedVisibilityRef = useRef(false);

  // Picking the "active" video from the *same* 60%-visible bucket used for
  // general viewability was the bug behind "autoplay stops if I scroll past
  // an ebook/sermon" and "only the first video below Coming Soon autoplays":
  // an ebook or an audio-sermon card can easily fill most of the viewport by
  // itself, so no video ever reached 60% visible while scrolling past one -
  // the code saw "no video is visible" and paused, and never resumed once
  // the *next* video also failed to clear 60% before the user stopped
  // scrolling. Videos now get their own, much more lenient viewability
  // bucket (see videoViewabilityConfig below) so the nearest video always
  // wins regardless of what non-video content is sharing the screen.
  const handleVideoViewabilityImpl = useCallback(
    (info: { viewableItems: Array<{ item: FeedRow; isViewable: boolean }> }) => {
      // Hidden category panes can still fire viewability — ignore so they
      // don't steal playback from the active feed (keep-alive panes).
      if (!isFeedActiveRef.current) return;
      // Opening comments shifts the feed; ignore viewability so playback
      // isn't stolen/paused while the user is reading.
      if (commentsOpenRef.current) return;

      hasDeterminedVisibilityRef.current = true;

      let topVideoKey: string | null = null;
      for (const token of info.viewableItems) {
        const row = token.item;
        if (!row || row.rowType !== "media") continue;
        const mediaType = isAudioSermon(row.item) ? "audio" : detectMediaType(row.item);
        if (mediaType === "video") {
          topVideoKey = row.key;
          break;
        }
      }

      const prevKey = currentlyVisibleVideoRef.current;
      if (topVideoKey !== prevKey) {
        if (prevKey && useGlobalVideoStore.getState().playingVideos[prevKey]) {
          pauseMediaRef.current(prevKey);
        }
        setCurrentlyVisibleVideo(topVideoKey);
        currentlyVisibleVideoRef.current = topVideoKey;
        if (topVideoKey && isAutoPlayEnabledRef.current) {
          playMediaRef.current(topVideoKey, "video");
        }
      }
    },
    []
  );

  const handleVideoViewabilityRef = useRef(handleVideoViewabilityImpl);
  useEffect(() => {
    handleVideoViewabilityRef.current = handleVideoViewabilityImpl;
  }, [handleVideoViewabilityImpl]);

  // Stable identity across renders - FlashList/FlatList warn (and can drop
  // events) if this prop's identity changes, so we forward through a ref.
  const onVideoViewableItemsChanged = useCallback((info: any) => {
    handleVideoViewabilityRef.current(info);
  }, []);

  // Separate, stricter bucket used only to decide when to pause audio that
  // has scrolled mostly out of view (mirrors the old scroll-based "pause if
  // scrolled away" safety net, but driven by the reliable viewability
  // signal instead of onLayout math).
  const handleAudioViewabilityImpl = useCallback(
    (info: { viewableItems: Array<{ item: FeedRow; isViewable: boolean }> }) => {
      const feedAudioId = playingAudioIdRef.current;
      const activeKeys = feedAudioId ? [feedAudioId] : [];
      if (activeKeys.length === 0) return;

      const stillVisible = info.viewableItems.some((token) => {
        if (token.item?.rowType !== "media") return false;
        const item = token.item.item;
        const id = item?._id ? String(item._id) : "";
        return activeKeys.some(
          (key) =>
            key === token.item.key ||
            key === id ||
            key === `music-${id}` ||
            (id && key.includes(id))
        );
      });
      if (!stillVisible) {
        pauseAllAudioRef.current();
      }
    },
    []
  );

  const handleAudioViewabilityRef = useRef(handleAudioViewabilityImpl);
  useEffect(() => {
    handleAudioViewabilityRef.current = handleAudioViewabilityImpl;
  }, [handleAudioViewabilityImpl]);

  const onAudioViewableItemsChanged = useCallback((info: any) => {
    handleAudioViewabilityRef.current(info);
  }, []);

  const handleRowFocusImpl = useCallback(
    (info: { viewableItems: Array<{ item: FeedRow; isViewable: boolean }> }) => {
      if (!isFeedActiveRef.current) return;
      if (commentsOpenRef.current) return;
      let topKey: string | null = null;
      for (const token of info.viewableItems) {
        const row = token.item;
        if (!row || row.rowType !== "media") continue;
        topKey = row.key;
        break;
      }
      setFocusedFeedKey((prev) => (prev === topKey ? prev : topKey));
    },
    []
  );
  const handleRowFocusRef = useRef(handleRowFocusImpl);
  useEffect(() => {
    handleRowFocusRef.current = handleRowFocusImpl;
  }, [handleRowFocusImpl]);
  const onRowFocusViewableItemsChanged = useCallback((info: any) => {
    handleRowFocusRef.current(info);
  }, []);

  // itemVisiblePercentThreshold is intentionally lower than the audio
  // bucket's 60% - a video just needs to be *starting* to appear on screen
  // to become the active one, so there's no dead zone while a taller
  // ebook/sermon card is still mostly covering the viewport above/below it.
  // minimumViewTime is kept at a normal debounce (not near-zero) on
  // purpose: dropping it too low made the active video switch on every
  // scroll frame, and each switch fires an imperative pause() on the
  // previous player racing the new one's play() - expo-av doesn't always
  // win that race cleanly, which was surfacing as "video plays but audio
  // never starts" (silent picture) once switching got fast enough.
  const videoViewabilityConfig = useRef({
    itemVisiblePercentThreshold: FEED_VIDEO_VISIBLE_PERCENT,
    minimumViewTime: FEED_VIDEO_MIN_VIEW_MS,
  }).current;
  const audioViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 200,
  }).current;

  const rowFocusViewabilityConfig = useRef({
    itemVisiblePercentThreshold: 35,
    minimumViewTime: 120,
  }).current;

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig: videoViewabilityConfig, onViewableItemsChanged: onVideoViewableItemsChanged },
    { viewabilityConfig: audioViewabilityConfig, onViewableItemsChanged: onAudioViewableItemsChanged },
    { viewabilityConfig: rowFocusViewabilityConfig, onViewableItemsChanged: onRowFocusViewableItemsChanged },
  ]).current;

  // ---------------------------------------------------------------------
  // Grow-only player mounts: viewability still decides WHAT plays, but once
  // a video has been near the viewport we KEEP its <Video> mounted (paused).
  // Scroll-up / scroll-down must not tear down and remount — that looked
  // like an auto-refresh in ALL / VIDEO / SERMON.
  // ---------------------------------------------------------------------
  const [mountedVideoKeys, setMountedVideoKeys] = useState<Set<string>>(
    () => new Set()
  );
  const visitOrderRef = useRef<string[]>([]);

  useEffect(() => {
    const seqByKey = mediaSeqByKeyRef.current;
    const keyBySeq = mediaKeyBySeqRef.current;
    const hot = new Set<string>();

    if (!isFeedActive) {
      // Hidden category panes: drop all decoders unless we explicitly keep
      // a tiny idle warm set (active-only keepVideoDecoders from Home).
      if (keepVideoDecoders) {
        for (let i = 0; i < FEED_WARM_IDLE_MOUNT_COUNT; i++) {
          const k = keyBySeq[i];
          if (k) hot.add(k);
        }
        warmSeqRange(0, FEED_PRELOAD_WARM_DISTANCE);
      } else {
        setMountedVideoKeys((prev) => (prev.size === 0 ? prev : new Set()));
        return;
      }
    } else if (
      currentlyVisibleVideo &&
      seqByKey[currentlyVisibleVideo] !== undefined
    ) {
      const activeSeq = seqByKey[currentlyVisibleVideo];
      hot.add(currentlyVisibleVideo);
      const neighbor = liteActive ? 1 : FEED_PRELOAD_NEIGHBOR_DISTANCE;
      for (let d = 1; d <= neighbor; d++) {
        const before = keyBySeq[activeSeq - d];
        const after = keyBySeq[activeSeq + d];
        if (after && shouldMountLitePlayer(activeSeq + d, activeSeq)) {
          hot.add(after);
        }
        if (!liteActive && before) hot.add(before);
      }
      warmSeqRange(activeSeq, liteActive ? 1 : FEED_PRELOAD_WARM_DISTANCE);
    } else if (!hasDeterminedVisibilityRef.current) {
      const initial = liteActive ? 2 : FEED_INITIAL_MOUNT_COUNT;
      for (let i = 0; i < initial; i++) {
        const k = keyBySeq[i];
        if (k) hot.add(k);
      }
      warmSeqRange(0, liteActive ? 1 : FEED_PRELOAD_WARM_DISTANCE);
    }

    if (hot.size === 0) return;

    setMountedVideoKeys((prev) => {
      // Hidden panes: keep only the idle warm set — drop everything else.
      if (!isFeedActive && keepVideoDecoders) {
        const same =
          prev.size === hot.size && [...hot].every((k) => prev.has(k));
        return same ? prev : hot;
      }

      const next = new Set(prev);
      let changed = false;

      hot.forEach((key) => {
        if (!next.has(key)) {
          next.add(key);
          changed = true;
        }
        const order = visitOrderRef.current;
        const idx = order.indexOf(key);
        if (idx >= 0) order.splice(idx, 1);
        order.push(key);
      });

      // Prune oldest mounts outside the hot window so we never exceed the
      // hardware decoder budget (this was hanging the app).
      while (next.size > maxPlayers) {
        const order = visitOrderRef.current;
        const oldest = order.find((k) => next.has(k) && !hot.has(k));
        if (!oldest) break;
        next.delete(oldest);
        const oi = order.indexOf(oldest);
        if (oi >= 0) order.splice(oi, 1);
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [
    currentlyVisibleVideo,
    listData,
    warmSeqRange,
    isFeedActive,
    keepVideoDecoders,
    liteActive,
    maxPlayers,
  ]);

  const getItemType = useCallback((row: FeedRow) => {
    if (row.rowType !== "media") return row.rowType;
    if (isAudioSermon(row.item)) return "media-audio";
    const mediaType = detectMediaType(row.item);
    return mediaType === "video" ? "media-video" : "media-audio";
  }, []);

  // Lock video row size so FlashList never recalculates mid-scroll when a
  // player mounts/reveals (that was stacking content with a flash).
  const overrideItemLayout = useCallback(
    (layout: { size?: number }, row: FeedRow) => {
      if (row.rowType === "spacer") {
        layout.size = row.height;
        return;
      }
      if (row.rowType === "section-title") {
        layout.size = 48;
        return;
      }
      if (row.rowType === "coming-soon") {
        layout.size = 320;
        return;
      }
      if (row.rowType === "media") {
        if (!isAudioSermon(row.item) && detectMediaType(row.item) === "video") {
          layout.size = FEED_VIDEO_ROW_SIZE;
        }
      }
    },
    []
  );

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
          // Only mount a real player for hot keys — never bootstrap 18 at once.
          const shouldRenderPlayer =
            mountedVideoKeys.has(row.key) ||
            currentlyVisibleVideo === row.key;
          return renderContentByType(
            row.item,
            row.renderIndex,
            shouldRenderPlayer
          );
        default:
          return null;
      }
    },
    [renderContentByType, mountedVideoKeys, currentlyVisibleVideo]
  );

  const keyExtractor = useCallback((row: FeedRow) => row.key, []);

  // Membership signature (not just size) so FlashList re-renders when the
  // set swaps at HARD_MAX — otherwise scroll-back kept empty stages.
  const mountedPlayerSig = useMemo(
    () => Array.from(mountedVideoKeys).sort().join("|"),
    [mountedVideoKeys]
  );
  const feedExtraData = useMemo(
    () => ({
      visible: currentlyVisibleVideo,
      primed: mountedPlayerSig,
      playing: currentlyPlayingVideo,
      active: isFeedActive,
      authors: authorStoreVersion,
    }),
    [
      currentlyVisibleVideo,
      mountedPlayerSig,
      currentlyPlayingVideo,
      isFeedActive,
      authorStoreVersion,
    ]
  );

  const handleEndReached = useCallback(() => {
    if (isLoadingMore || !hasMoreDefaultPages) return;
    loadMoreContent();
  }, [isLoadingMore, hasMoreDefaultPages, loadMoreContent]);

  // Coming Soon sits after the first four — keep loading until that section
  // has a real list of items (cold start often only had page 1 above the card).
  useEffect(() => {
    if (liteActive) return;
    if (activeTab !== "ALL" && activeTab !== "live") return;
    if (rest.length >= 12) return;
    if (!hasMoreDefaultPages || isLoadingMore) return;
    loadMoreContent();
  }, [
    liteActive,
    activeTab,
    rest.length,
    hasMoreDefaultPages,
    isLoadingMore,
    loadMoreContent,
  ]);

  // One-shot boost when Coming Soon has zero rows under it after page 1.
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

  // Ensure TikTok-style autoplay is on for this feed.
  useEffect(() => {
    enableAutoPlayAction();
  }, [enableAutoPlayAction]);

  if (error && !hasContent) return <ErrorState message={error} />;

  // Never flash Loading/Empty for a hidden category pane — that looks like
  // a remount refresh when switching ALL ↔ VIDEO ↔ SERMON.
  if (!isFeedActive && filteredMediaList.length === 0) {
    return <View style={{ flex: 1 }} />;
  }

  const waitingForComingSoonBackbone =
    isFeedActive &&
    (activeTab === "ALL" || activeTab === "live") &&
    filteredMediaList.length === 0 &&
    defaultContent.length === 0 &&
    defaultContentLoading;

  // Show a skeleton while a fetch is in flight instead of flashing
  // "No content available" - this also covers the case where useAuthFeed
  // flips (once auth resolves) and starts a fresh, uncached query under a
  // different cache key, which would otherwise briefly report zero items.
  if (
    isFeedActive &&
    ((filteredMediaList.length === 0 && loading) || waitingForComingSoonBackbone)
  ) {
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
          overrideItemLayout={overrideItemLayout}
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
          scrollEnabled={!commentsOpen}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
          scrollEventThrottle={16}
          estimatedItemSize={listWindow.estimatedItemSize || FEED_VIDEO_ROW_SIZE}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.75}
          // Lite: clip off-screen cells (OOM). Full: keep surfaces to avoid black flash.
          removeClippedSubviews={liteActive}
          overscan={liteActive ? 120 : 800}
          drawDistance={liteActive ? listWindow.drawDistance : 1600}
        />
      </View>
    </ContentErrorBoundary>
  );
};
