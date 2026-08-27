import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, InteractionManager, Platform, Share, StatusBar, View } from "react-native";
import {
  initialWindowMetrics as safeAreaInitialMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { isCopyrightFreeSong } from "@/shared/audio";
import { resolveAlbumArtSource } from "@/shared/brand/albumArt";
import copyrightFreeMusicAPI from "@/app/services/copyrightFreeMusicAPI";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { usePlaylistStore, type Playlist } from "@/store/usePlaylistStore";
import type { CopyrightFreeSongModalProps } from "../types";
import {
  useCopyrightFreeSongRealtime,
  useCopyrightFreeSongViewTracking,
  useSeekPanResponder,
} from "../useCopyrightFreeSongModalLogic";
import { usePlaylistActions } from "../usePlaylistActions";
import { useSongInteractions } from "../useSongInteractions";
import { transformBackendSong } from "../utils/transformBackendSong";
import { useModalSheetAnimations } from "./useModalSheetAnimations";

const defaultFormatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export function useSongModalController({
  visible,
  song,
  onClose,
  onPlay,
  isPlaying = false,
  audioProgress = 0,
  audioDuration = 0,
  audioPosition = 0,
  isMuted = false,
  onTogglePlay,
  onToggleMute,
  onSeek,
  formatTime = defaultFormatTime,
  variant,
  initialAction,
}: CopyrightFreeSongModalProps) {
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showPlaylistView, setShowPlaylistView] = useState(false);
  const [showPlaylistDetail, setShowPlaylistDetail] = useState(false);
  const [selectedPlaylistForDetail, setSelectedPlaylistForDetail] =
    useState<Playlist | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const progressBarRef = useRef<View>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(
    variant === "options" || initialAction === "options"
  );
  const [optionsSongData, setOptionsSongData] = useState<any | null>(null);
  const [loadingOptionsSong, setLoadingOptionsSong] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  const insets = useSafeAreaInsets();
  const metricsBottom = safeAreaInitialMetrics?.insets?.bottom ?? 0;
  const metricsTop = safeAreaInitialMetrics?.insets?.top ?? 0;
  const safeBottom = Math.max(
    insets.bottom,
    metricsBottom,
    Platform.OS === "android" ? 24 : 0
  );
  const safeTop =
    insets.top ||
    metricsTop ||
    (Platform.OS === "android" ? StatusBar.currentHeight || 24 : 44);
  /**
   * Just the system inset — no allowance for the bottom nav.
   *
   * This used to be `safeBottom + round(getBottomNavHeight() * 0.35)`, a
   * hand-tuned fraction reserving space for nav chrome. That was reserving
   * space for something the overlay covers: it renders after the router `Slot`
   * so it already paints over the nav. The reserved strip just pushed the
   * controls up and, because the padding sat outside the opaque background,
   * turned into a transparent window onto the nav.
   */
  const contentBottomInset = safeBottom;

  const {
    isLiked,
    likeCount,
    viewCount,
    shareCount,
    saveCount,
    isInLibrary,
    isTogglingLike,
    isTogglingSave,
    setIsLiked,
    setLikeCount,
    setViewCount,
    setShareCount,
    setSaveCount,
    setIsInLibrary,
    handleToggleLike,
    handleToggleSave,
  } = useSongInteractions(song);

  const {
    isLoadingPlaylists,
    newPlaylistName,
    newPlaylistDescription,
    setNewPlaylistName,
    setNewPlaylistDescription,
    handleCreatePlaylist,
    handleAddToExistingPlaylist,
    handleDeletePlaylist,
  } = usePlaylistActions(song, setShowCreatePlaylist, setShowPlaylistModal);

  const repeatMode = useGlobalAudioPlayerStore((s) => s.repeatMode);
  const isShuffled = useGlobalAudioPlayerStore((s) => s.isShuffled);
  const setRepeatMode = useGlobalAudioPlayerStore((s) => s.setRepeatMode);
  const toggleShuffle = useGlobalAudioPlayerStore((s) => s.toggleShuffle);
  const { playlists, loadPlaylistsFromBackend } = usePlaylistStore();

  const {
    gesture,
    modalAnimatedStyle,
    playlistViewAnimatedStyle,
    playlistDetailAnimatedStyle,
  } = useModalSheetAnimations({
    visible,
    showPlaylistView,
    showPlaylistDetail,
    onClose,
  });

  useEffect(() => {
    if (song) setHasTrackedView(false);
  }, [song]);

  useEffect(() => {
    if (!visible) {
      setShowOptionsModal(false);
      setShowPlaylistModal(false);
      setShowCreatePlaylist(false);
      setShowPlaylistView(false);
      setShowPlaylistDetail(false);
      return;
    }
    if (initialAction === "options" || variant === "options") {
      setShowOptionsModal(true);
    }
    if (initialAction === "playlist") {
      setShowPlaylistModal(true);
    }
  }, [visible, initialAction, variant]);

  const isCfSong = isCopyrightFreeSong(song);

  useCopyrightFreeSongViewTracking({
    visible: visible && isCfSong,
    song,
    isPlaying,
    audioProgress,
    audioPosition,
    audioDuration,
    hasTrackedView,
    setHasTrackedView,
    setViewCount,
    likeCount,
  });

  useCopyrightFreeSongRealtime({
    visible: visible && isCfSong,
    songId: isCfSong ? song?._id || song?.id || null : null,
    setLikeCount,
    setViewCount,
    setIsLiked,
    setShareCount,
    setIsInLibrary,
    setSaveCount,
  });

  const seekGesture = useSeekPanResponder({
    audioProgress,
    onSeek,
    progressBarRef,
    setIsSeeking,
    setSeekProgress,
  });

  const prevShowPlaylistModalRef = useRef(false);
  useEffect(() => {
    if (showPlaylistModal && !prevShowPlaylistModalRef.current) {
      InteractionManager.runAfterInteractions(() => loadPlaylistsFromBackend());
    }
    prevShowPlaylistModalRef.current = showPlaylistModal;
  }, [showPlaylistModal, loadPlaylistsFromBackend]);

  const handleOptionsPress = useCallback(() => {
    if (!song) return;
    setOptionsSongData(null);
    setShowOptionsModal(true);
  }, [song]);

  useEffect(() => {
    if (!visible || !song || !isCopyrightFreeSong(song)) return;
    const songId = song.id || song._id;
    if (!songId) return;

    let cancelled = false;
    copyrightFreeMusicAPI
      .getSongById(songId)
      .then((response) => {
        if (cancelled || !response.success || !response.data) return;
        const fresh = transformBackendSong(response.data);
        setIsLiked(Boolean(fresh.isLiked));
        setLikeCount(fresh.likeCount ?? fresh.likes ?? 0);
        setViewCount(fresh.viewCount ?? fresh.views ?? 0);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [visible, song?._id, song?.id, setIsLiked, setLikeCount, setViewCount]);

  useEffect(() => {
    if (!showOptionsModal || !song || !isCopyrightFreeSong(song)) return;
    const songId = song.id || song._id;
    if (!songId) return;

    setLoadingOptionsSong(true);
    copyrightFreeMusicAPI
      .getSongById(songId)
      .then((response) => {
        if (response.success && response.data) {
          const transformedSong = transformBackendSong(response.data);
          setOptionsSongData(transformedSong);
          setViewCount((prev: number) =>
            Math.max(
              transformedSong.views ?? transformedSong.viewCount ?? 0,
              likeCount ?? 0,
              prev
            )
          );
        }
      })
      .catch(() => setOptionsSongData(song))
      .finally(() => setLoadingOptionsSong(false));
  }, [showOptionsModal, song, likeCount, setViewCount]);

  const handleClosePlaylistModal = useCallback(() => setShowPlaylistModal(false), []);

  const handleShare = useCallback(async () => {
    if (!song) return;
    const songId = song._id || song.id;
    if (!songId) return;

    try {
      // Prefer BE shareUrl (detail); fall back to fetch if list omitted it
      let shareUrl = song.shareUrl as string | undefined;
      if (!shareUrl && isCopyrightFreeSong(song)) {
        try {
          const detail = await copyrightFreeMusicAPI.getSongById(songId);
          if (detail.success && detail.data) {
            shareUrl = (detail.data as any).shareUrl;
            if (typeof (detail.data as any).shareCount === "number") {
              setShareCount((detail.data as any).shareCount);
            }
          }
        } catch {
          // soft-fail — still share with audio URL
        }
      }

      const result = await Share.share({
        title: song.title,
        message: shareUrl
          ? `Listen to ${song.title} on Jevah\n${shareUrl}`
          : `Listen to ${song.title} on Jevah`,
        url: shareUrl || song.audioUrl || song.fileUrl,
      });
      if (result.action === Share.sharedAction) {
        const response = await copyrightFreeMusicAPI.recordShare(
          songId,
          result.activityType || "internal"
        );
        if (response.success && response.data) {
          if (typeof response.data.shareCount === "number") {
            setShareCount(response.data.shareCount);
          } else {
            setShareCount((prev) => prev + 1);
          }
          if (typeof response.data.viewCount === "number") {
            setViewCount(response.data.viewCount);
          }
          if (response.data.likeCount !== undefined) {
            setLikeCount(response.data.likeCount);
          }
        }
      }
    } catch (error) {
      if (__DEV__) console.warn("Failed to share copyright-free song:", error);
    }
  }, [song, likeCount, setViewCount, setShareCount, setLikeCount]);

  const handleSkip = useCallback(
    (seconds: number) => {
      if (!onSeek) return;
      const durationMs = audioDuration || (song?.duration ? song.duration * 1000 : 0);
      if (!durationMs || durationMs <= 0) return;
      const newPositionMs = Math.max(
        0,
        Math.min(durationMs, (audioPosition || 0) + seconds * 1000)
      );
      onSeek(newPositionMs / durationMs);
    },
    [onSeek, audioDuration, audioPosition, song]
  );

  const imageSource = useMemo(
    () =>
      resolveAlbumArtSource(
        song?.thumbnailUrl || song?.release?.coverUrl || song?.imageUrl
      ),
    [song?.thumbnailUrl, song?.release?.coverUrl, song?.imageUrl]
  );

  const albumArtSize = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    const chrome = safeTop + contentBottomInset + 200;
    const usable = screenHeight - chrome;
    return Math.min(
      screenWidth * 0.62,
      screenHeight * 0.32,
      Math.max(usable * 0.42, 140),
      260
    );
  }, [safeTop, contentBottomInset]);

  const handleRepeatCycle = useCallback(() => {
    if (repeatMode === "none") setRepeatMode("all");
    else if (repeatMode === "all") setRepeatMode("one");
    else setRepeatMode("none");
  }, [repeatMode, setRepeatMode]);

  return {
    song,
    formatTime,
    isPlaying,
    isMuted,
    audioProgress,
    audioDuration,
    audioPosition,
    showPlaylistModal,
    setShowPlaylistModal,
    showCreatePlaylist,
    setShowCreatePlaylist,
    showPlaylistView,
    setShowPlaylistView,
    showPlaylistDetail,
    setShowPlaylistDetail,
    selectedPlaylistForDetail,
    setSelectedPlaylistForDetail,
    isSeeking,
    seekProgress,
    progressBarRef,
    showOptionsModal,
    setShowOptionsModal,
    optionsSongData,
    setOptionsSongData,
    loadingOptionsSong,
    isLiked,
    likeCount,
    viewCount,
    shareCount,
    saveCount,
    isInLibrary,
    isTogglingLike,
    isTogglingSave,
    isLoadingPlaylists,
    newPlaylistName,
    newPlaylistDescription,
    setNewPlaylistName,
    setNewPlaylistDescription,
    playlists,
    loadPlaylistsFromBackend,
    repeatMode,
    isShuffled,
    toggleShuffle,
    gesture,
    modalAnimatedStyle,
    playlistViewAnimatedStyle,
    playlistDetailAnimatedStyle,
    panHandlers: seekGesture.panHandlers,
    onBarLayout: seekGesture.onBarLayout,
    handleOptionsPress,
    handleToggleLike,
    handleToggleSave,
    handleShare,
    handleSkip,
    handleRepeatCycle,
    handleDeletePlaylist,
    handleCreatePlaylist,
    handleAddToExistingPlaylist,
    handleClosePlaylistModal,
    imageSource,
    albumArtSize,
    safeTop,
    safeBottom,
    contentBottomInset,
    onClose,
    onPlay,
    onTogglePlay,
    onToggleMute,
  };
}
