import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, InteractionManager, Platform, Share, StatusBar, View } from "react-native";
import {
  initialWindowMetrics as safeAreaInitialMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { isCopyrightFreeSong } from "@/shared/audio";
import { resolveAlbumArtSource } from "@/shared/brand/albumArt";
import copyrightFreeMusicAPI from "@/app/services/copyrightFreeMusicAPI";
import { playlistAPI } from "@/app/utils/playlistAPI";
import {
  hydratePlaylist,
  playPlaylistQueue,
} from "@/app/utils/openPlaylistNowPlaying";
import { useDownloadHandler } from "@/app/utils/downloadUtils";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { cycleRepeatOne } from "@/store/audioPlayer/queueAdvance";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
import { playCopyrightFreeSong } from "@/app/components/CopyrightFreeSongs/hooks/useCopyrightFreeSongsPlayback";
import { usePlaylistStore, type Playlist, type PlaylistSong } from "@/store/usePlaylistStore";
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
  const playerReturnRef = useRef<{ song: any; queue: any[] } | null>(null);

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
  const toggleShuffle = useGlobalAudioPlayerStore((s) => s.toggleShuffle);
  const setRepeatMode = useGlobalAudioPlayerStore((s) => s.setRepeatMode);
  const audioQueue = useGlobalAudioPlayerStore((s) => s.queue);
  const overlaySongs = useCopyrightFreeOverlayStore((s) => s.songs);
  const { playlists, loadPlaylistsFromBackend } = usePlaylistStore();
  const { handleDownload: downloadItem } = useDownloadHandler();

  const queueSongs = useMemo(() => {
    if (overlaySongs?.length) return overlaySongs;
    return (audioQueue || []).map((track) => ({
      id: track.id,
      _id: track.id,
      title: track.title,
      artist: track.artist,
      thumbnailUrl: track.thumbnailUrl,
      audioUrl: track.audioUrl,
      duration: track.duration,
      source: track.source,
    }));
  }, [overlaySongs, audioQueue]);

  const handleSelectQueueSong = useCallback(
    (next: any) => {
      if (!next) return;
      useCopyrightFreeOverlayStore.getState().setSong(next);
      onPlay?.(next);
    },
    [onPlay]
  );

  const { playlistViewAnimatedStyle, playlistDetailAnimatedStyle } =
    useModalSheetAnimations({
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
    hasTrackedView,
    setHasTrackedView,
    setViewCount,
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

  const resumePlayerAfterPlaylist = useCallback(async () => {
    const saved = playerReturnRef.current;
    playerReturnRef.current = null;
    setShowPlaylistDetail(false);
    setSelectedPlaylistForDetail(null);
    setShowPlaylistModal(false);
    const songToPlay = saved?.song;
    if (!songToPlay) return;
    const queue = saved.queue?.length > 0 ? saved.queue : [songToPlay];
    const overlay = useCopyrightFreeOverlayStore.getState();
    overlay.setQueue(queue);
    overlay.setSong(songToPlay);
    await playCopyrightFreeSong(songToPlay, queue);
  }, []);

  const handleClosePlaylistModal = useCallback(() => {
    setShowPlaylistModal(false);
    if (playerReturnRef.current) {
      void resumePlayerAfterPlaylist();
    }
  }, [resumePlayerAfterPlaylist]);

  const openPlaylistDetail = useCallback(async (playlist: Playlist) => {
    const overlay = useCopyrightFreeOverlayStore.getState();
    playerReturnRef.current = {
      song: overlay.song,
      queue: overlay.songs?.length
        ? overlay.songs
        : overlay.song
          ? [overlay.song]
          : [],
    };
    setShowPlaylistModal(false);
    setSelectedPlaylistForDetail(playlist);
    setShowPlaylistDetail(true);
    const { played, playlist: full } = await playPlaylistQueue(playlist, 0);
    setSelectedPlaylistForDetail(full);
    if (!played) {
      Alert.alert("Empty playlist", "Add a song first.");
    }
  }, []);

  const playSelectedPlaylistAt = useCallback(
    async (index: number) => {
      const selected = selectedPlaylistForDetail;
      if (!selected) return;
      const { played, playlist: full } = await playPlaylistQueue(
        selected,
        index
      );
      setSelectedPlaylistForDetail(full);
      if (!played) {
        Alert.alert("Empty playlist", "Add a song first.");
      }
    },
    [selectedPlaylistForDetail]
  );

  const handleRemovePlaylistTrack = useCallback(
    async (track: PlaylistSong) => {
      const selected = selectedPlaylistForDetail;
      if (!selected) return;
      Alert.alert("Remove Track", "Remove this track from the playlist?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await playlistAPI.removeTrackFromPlaylist(
                selected.id,
                track.id,
                track.trackType || "copyrightFree"
              );
              if (!result.success) {
                Alert.alert("Error", result.error || "Failed to remove track");
                return;
              }
              await loadPlaylistsFromBackend();
              const refreshed =
                usePlaylistStore.getState().playlists.find((p) => p.id === selected.id) ||
                selected;
              setSelectedPlaylistForDetail(await hydratePlaylist(refreshed));
            } catch {
              Alert.alert("Error", "Failed to remove track");
            }
          },
        },
      ]);
    },
    [selectedPlaylistForDetail, loadPlaylistsFromBackend]
  );

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
        if (!isCopyrightFreeSong(song)) {
          try {
            const { mediaApi } = await import("@/core/api/MediaApi");
            await mediaApi.recordShare(
              String(songId),
              song?.lane === "artist" || song?.contentType === "artist-music"
                ? "music"
                : String(song?.contentType || "media"),
              result.activityType || "internal"
            );
            setShareCount((prev: number) => prev + 1);
          } catch {
            // share already happened; tracking is best-effort
          }
          return;
        }
        const response = await copyrightFreeMusicAPI.recordShare(
          songId,
          result.activityType || "internal"
        );
        if (response.success && response.data) {
          if (typeof response.data.shareCount === "number") {
            setShareCount(response.data.shareCount);
          } else {
            setShareCount((prev: number) => prev + 1);
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

  const handlePrevious = useCallback(() => {
    void useGlobalAudioPlayerStore.getState().previous();
  }, []);

  const handleNext = useCallback(() => {
    void useGlobalAudioPlayerStore.getState().next({ fromUser: true });
  }, []);

  const handleRepeatCycle = useCallback(() => {
    const store = useGlobalAudioPlayerStore.getState();
    const nextMode = cycleRepeatOne(store.repeatMode);
    setRepeatMode(nextMode);
    if (nextMode !== "one") return;
    void (async () => {
      const sound = store.soundInstance;
      if (sound?.isLoaded) {
        try {
          await sound.seekTo(0);
        } catch {
          // play() will still try
        }
      }
      await useGlobalAudioPlayerStore.getState().play();
    })();
  }, [setRepeatMode]);

  const handleDownload = useCallback(async () => {
    if (!song) return;
    const id = String(song._id || song.id || "");
    const fileUrl = song.audioUrl || song.fileUrl;
    if (!id || !fileUrl) return;
    await downloadItem({
      id,
      title: song.title || "Track",
      description: song.description || "",
      author: song.artist || "",
      contentType: "audio",
      fileUrl,
      thumbnailUrl: song.thumbnailUrl || song.imageUrl,
    });
  }, [song, downloadItem]);

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
    const chrome = safeTop + contentBottomInset + 140;
    const usable = screenHeight - chrome;
    return Math.min(
      screenWidth * 0.52,
      screenHeight * 0.22,
      Math.max(usable * 0.24, 140),
      200
    );
  }, [safeTop, contentBottomInset]);

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
    playlistViewAnimatedStyle,
    playlistDetailAnimatedStyle,
    panHandlers: seekGesture.panHandlers,
    onBarLayout: seekGesture.onBarLayout,
    handleOptionsPress,
    handleToggleLike,
    handleToggleSave,
    handleShare,
    handlePrevious,
    handleNext,
    handleRepeatCycle,
    handleDownload,
    handleSelectQueueSong,
    queueSongs,
    handleDeletePlaylist,
    handleCreatePlaylist,
    handleAddToExistingPlaylist,
    handleClosePlaylistModal,
    resumePlayerAfterPlaylist,
    openPlaylistDetail,
    playSelectedPlaylistAt,
    handleRemovePlaylistTrack,
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
