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
import { mapPlaylistTracksToSongs } from "@/app/utils/playlistTrackMapper";
import { useDownloadHandler } from "@/app/utils/downloadUtils";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { cycleRepeatOne } from "@/store/audioPlayer/queueAdvance";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
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

  const handleClosePlaylistModal = useCallback(() => setShowPlaylistModal(false), []);

  const hydratePlaylist = useCallback(async (playlist: Playlist): Promise<Playlist> => {
    try {
      const result = await playlistAPI.getPlaylistById(playlist.id);
      if (!result.success || !result.data) return playlist;
      const songs = mapPlaylistTracksToSongs(result.data.tracks);
      return {
        id: result.data._id,
        name: result.data.name,
        description: result.data.description,
        songs: songs.length > 0 ? songs : playlist.songs || [],
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
        thumbnailUrl:
          songs[0]?.thumbnailUrl ||
          playlist.thumbnailUrl ||
          result.data.tracks?.[0]?.content?.thumbnailUrl,
        totalTracks:
          result.data.totalTracks || songs.length || playlist.songs?.length,
      };
    } catch {
      return playlist;
    }
  }, []);

  const openPlaylistDetail = useCallback(
    async (playlist: Playlist) => {
      const full = await hydratePlaylist(playlist);
      setSelectedPlaylistForDetail(full);
      setShowPlaylistModal(false);
      setShowPlaylistDetail(true);
    },
    [hydratePlaylist]
  );

  const playSelectedPlaylistAt = useCallback(
    async (index: number) => {
      const selected = selectedPlaylistForDetail;
      if (!selected) return;
      const playable = selected.songs.filter((s) => s.audioUrl);
      if (playable.length === 0) {
        Alert.alert("Empty playlist", "Add a song first.");
        return;
      }
      const start = Math.max(0, Math.min(index, playable.length - 1));
      const queue = playable.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        audioUrl: s.audioUrl,
        thumbnailUrl: s.thumbnailUrl,
        duration: s.duration,
        category: s.category,
        description: s.description,
        source:
          s.trackType === "copyrightFree"
            ? ("copyright-free" as const)
            : ("library" as const),
      }));
      useGlobalAudioPlayerStore.setState({
        queue,
        originalQueue: queue,
        currentIndex: start,
      });
      await useGlobalAudioPlayerStore.getState().setTrack(queue[start], true);
      const ui = playable.map((s) => ({
        id: s.id,
        _id: s.id,
        title: s.title,
        artist: s.artist,
        audioUrl: s.audioUrl,
        thumbnailUrl: s.thumbnailUrl,
        duration: s.duration,
      }));
      useCopyrightFreeOverlayStore.getState().open(ui[start], { queue: ui });
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
    [selectedPlaylistForDetail, loadPlaylistsFromBackend, hydratePlaylist]
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
