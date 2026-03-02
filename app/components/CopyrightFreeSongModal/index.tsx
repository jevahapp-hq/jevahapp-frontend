/**
 * CopyrightFreeSongModal - Composed from SongModalPlayer, SongModalOptions, etc.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  InteractionManager,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useGlobalAudioPlayerStore } from "../../store/useGlobalAudioPlayerStore";
import { usePlaylistStore, type Playlist } from "../../store/usePlaylistStore";
import copyrightFreeMusicAPI from "../../services/copyrightFreeMusicAPI";
import { playlistAPI } from "../../utils/playlistAPI";
import {
  useCopyrightFreeSongRealtime,
  useCopyrightFreeSongViewTracking,
  useSeekPanResponder,
} from "./useCopyrightFreeSongModalLogic";
import { SongModalCreatePlaylist } from "./SongModalCreatePlaylist";
import { SongModalOptions } from "./SongModalOptions";
import { SongModalPlayer } from "./SongModalPlayer";
import { SongModalPlaylistDetail } from "./SongModalPlaylistDetail";
import { SongModalPlaylistSelection } from "./SongModalPlaylistSelection";
import { SongModalPlaylistView } from "./SongModalPlaylistView";
import { transformBackendSong } from "./utils/transformBackendSong";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface CopyrightFreeSongModalProps {
  visible: boolean;
  song: any | null;
  onClose: () => void;
  onPlay?: (song: any) => void;
  isPlaying?: boolean;
  audioProgress?: number;
  audioDuration?: number;
  audioPosition?: number;
  isMuted?: boolean;
  onTogglePlay?: () => void;
  onToggleMute?: () => void;
  onSeek?: (progress: number) => void;
  formatTime?: (ms: number) => string;
  variant?: "player" | "options";
  initialAction?: "options" | "playlist" | null;
}

const defaultFormatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function CopyrightFreeSongModal({
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
  const [selectedPlaylistForDetail, setSelectedPlaylistForDetail] = useState<Playlist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const progressBarRef = useRef<View | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(variant === "options" || initialAction === "options");
  const [optionsSongData, setOptionsSongData] = useState<any | null>(null);
  const [loadingOptionsSong, setLoadingOptionsSong] = useState(false);
  const [isLiked, setIsLiked] = useState(song?.isLiked || false);
  const [likeCount, setLikeCount] = useState(song?.likeCount || song?.likes || 0);
  const [viewCount, setViewCount] = useState(
    song?.viewCount ?? song?.views ?? Math.max(song?.likeCount ?? 0, song?.likes ?? 0)
  );
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const repeatMode = useGlobalAudioPlayerStore((s) => s.repeatMode);
  const isShuffled = useGlobalAudioPlayerStore((s) => s.isShuffled);
  const setRepeatMode = useGlobalAudioPlayerStore((s) => s.setRepeatMode);
  const toggleShuffle = useGlobalAudioPlayerStore((s) => s.toggleShuffle);

  const {
    playlists,
    loadPlaylistsFromBackend,
  } = usePlaylistStore();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const playlistViewTranslateY = useSharedValue(SCREEN_HEIGHT);
  const playlistDetailTranslateY = useSharedValue(SCREEN_HEIGHT);
  
  // Swipe down to dismiss gesture
  const swipeTranslateY = useSharedValue(0);
  const isDismissing = useRef(false);

  useEffect(() => {
    if (song) {
      setIsLiked(song.isLiked || false);
      setLikeCount(song.likeCount || song.likes || 0);
      setViewCount(Math.max(song.viewCount ?? song.views ?? 0, song.likeCount ?? song.likes ?? 0));
      setHasTrackedView(false);
    }
  }, [song]);

  useCopyrightFreeSongViewTracking({
    visible,
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
    visible,
    songId: song?._id || song?.id || null,
    setLikeCount,
    setViewCount,
    setIsLiked,
  });

  const panResponder = useSeekPanResponder({
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

  useEffect(() => {
    if (showPlaylistView) {
      playlistViewTranslateY.value = withSpring(0, { damping: 30, stiffness: 300, mass: 0.8, overshootClamping: true });
    } else {
      playlistViewTranslateY.value = withSpring(SCREEN_HEIGHT, { damping: 30, stiffness: 300, mass: 0.8 });
    }
  }, [showPlaylistView, playlistViewTranslateY]);

  useEffect(() => {
    if (showPlaylistDetail) {
      playlistDetailTranslateY.value = withSpring(0, { damping: 30, stiffness: 300, mass: 0.8, overshootClamping: true });
    } else {
      playlistDetailTranslateY.value = withSpring(SCREEN_HEIGHT, { damping: 30, stiffness: 300, mass: 0.8 });
    }
  }, [showPlaylistDetail, playlistDetailTranslateY]);

  const playlistViewAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistViewTranslateY.value }],
  }));

  const playlistDetailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistDetailTranslateY.value }],
  }));

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 30, stiffness: 300, mass: 0.8, overshootClamping: true });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, { damping: 30, stiffness: 300, mass: 0.8 });
    }
  }, [visible, translateY]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + swipeTranslateY.value },
    ],
  }));

  const handleAddToPlaylist = useCallback(() => {
    if (!song) return;
    setShowPlaylistModal(true);
  }, [song]);

  const handleOptionsPress = useCallback(() => {
    if (!song) return;
    setOptionsSongData(null);
    setShowOptionsModal(true);
  }, [song]);

  useEffect(() => {
    if (!showOptionsModal || !song) return;
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
            Math.max(transformedSong.views ?? transformedSong.viewCount ?? 0, likeCount ?? 0, prev)
          );
        }
      })
      .catch(() => setOptionsSongData(song))
      .finally(() => setLoadingOptionsSong(false));
  }, [showOptionsModal, song, likeCount]);

  const handleClosePlaylistModal = useCallback(() => setShowPlaylistModal(false), []);

  const handleCreatePlaylist = useCallback(async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Please enter a playlist name");
      return;
    }
    try {
      setIsLoadingPlaylists(true);
      const result = await playlistAPI.createPlaylist({
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim() || undefined,
        isPublic: false,
      });
      if (!result.success || !result.data) {
        Alert.alert("Error", result.error || "Failed to create playlist");
        setIsLoadingPlaylists(false);
        return;
      }
      const playlistId = result.data._id;
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      setShowCreatePlaylist(false);
      await loadPlaylistsFromBackend();
      if (song) {
        const songId = song._id || song.id;
        if (songId) {
          const addResult = await playlistAPI.addTrackToPlaylist(playlistId, {
            copyrightFreeSongId: songId,
            position: undefined,
          });
          if (addResult.success) {
            await loadPlaylistsFromBackend();
            setShowPlaylistModal(false);
            Alert.alert("Success", "Playlist created and song added!");
          } else {
            setShowPlaylistModal(true);
            Alert.alert("Success", "Playlist created! But failed to add song.");
          }
        } else {
          setShowPlaylistModal(true);
          Alert.alert("Success", "Playlist created!");
        }
      } else {
        setShowPlaylistModal(true);
        Alert.alert("Success", "Playlist created!");
      }
      setIsLoadingPlaylists(false);
    } catch (error) {
      console.error("Error creating playlist:", error);
      Alert.alert("Error", "Failed to create playlist");
      setIsLoadingPlaylists(false);
    }
  }, [newPlaylistName, newPlaylistDescription, song, loadPlaylistsFromBackend]);

  const handleAddToExistingPlaylist = useCallback(
    async (playlistId: string) => {
      if (!song) return;
      try {
        setIsLoadingPlaylists(true);
        const songId = song._id || song.id;
        if (!songId) {
          Alert.alert("Error", "Invalid song ID");
          setIsLoadingPlaylists(false);
          return;
        }
        const result = await playlistAPI.addTrackToPlaylist(playlistId, {
          copyrightFreeSongId: songId,
          position: undefined,
        });
        if (!result.success) {
          if (result.error?.includes("already in the playlist")) {
            Alert.alert("Info", "This song is already in the playlist");
          } else {
            Alert.alert("Error", result.error || "Failed to add song to playlist");
          }
          setIsLoadingPlaylists(false);
          return;
        }
        await loadPlaylistsFromBackend();
        setNewPlaylistName("");
        setNewPlaylistDescription("");
        setShowCreatePlaylist(false);
        setShowPlaylistModal(false);
        Alert.alert("Success", "Song added to playlist!");
        setIsLoadingPlaylists(false);
      } catch (error) {
        console.error("Error adding song to playlist:", error);
        Alert.alert("Error", "Failed to add song to playlist");
        setIsLoadingPlaylists(false);
      }
    },
    [song, loadPlaylistsFromBackend]
  );

  const handleToggleLike = useCallback(async () => {
    if (!song || isTogglingLike) return;
    const songId = song._id || song.id;
    if (!songId) return;
    const previousLiked = isLiked;
    const previousLikeCount = likeCount;
    setIsLiked(!previousLiked);
    setLikeCount(previousLiked ? previousLikeCount - 1 : previousLikeCount + 1);
    setIsTogglingLike(true);
    try {
      const result = await copyrightFreeMusicAPI.toggleLike(songId);
      if (result.success && result.data) {
        setIsLiked(result.data.liked);
        setLikeCount(result.data.likeCount);
        if (result.data.viewCount !== undefined) {
          setViewCount(Math.max(result.data.viewCount, result.data.likeCount ?? 0));
        }
      } else {
        setIsLiked(previousLiked);
        setLikeCount(previousLikeCount);
        Alert.alert("Error", "Failed to update like");
      }
    } catch (error) {
      setIsLiked(previousLiked);
      setLikeCount(previousLikeCount);
      Alert.alert("Error", "Failed to update like");
    } finally {
      setIsTogglingLike(false);
    }
  }, [song, isLiked, likeCount, isTogglingLike]);

  const handleDeletePlaylist = useCallback(
    async (playlistId: string) => {
      Alert.alert("Delete Playlist", "Are you sure you want to delete this playlist?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoadingPlaylists(true);
              const result = await playlistAPI.deletePlaylist(playlistId);
              if (result.success) {
                await loadPlaylistsFromBackend();
                Alert.alert("Success", "Playlist deleted");
              } else {
                Alert.alert("Error", result.error || "Failed to delete playlist");
              }
              setIsLoadingPlaylists(false);
            } catch (error) {
              console.error("Error deleting playlist:", error);
              Alert.alert("Error", "Failed to delete playlist");
              setIsLoadingPlaylists(false);
            }
          },
        },
      ]);
    },
    [loadPlaylistsFromBackend]
  );

  // Pan responder for swipe down to dismiss - faster and more responsive
  const dismissPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Respond quickly to downward swipes
        return gestureState.dy > 3;
      },
      onPanResponderGrant: () => {
        swipeTranslateY.value = 0;
        isDismissing.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          // Less resistance for more responsive feel
          const resistance = 0.85;
          swipeTranslateY.value = gestureState.dy * resistance;
          
          // Check if we've passed the dismiss threshold
          if (gestureState.dy > 80) {
            isDismissing.current = true;
          }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Lower threshold and velocity for faster dismiss
        if (gestureState.dy > 80 || (gestureState.dy > 40 && gestureState.vy > 0.5)) {
          // Dismiss the modal quickly
          swipeTranslateY.value = withSpring(SCREEN_HEIGHT, {
            damping: 15,
            stiffness: 300,
            mass: 0.5,
          }, () => {
            runOnJS(onClose)();
          });
        } else {
          // Snap back to original position quickly
          swipeTranslateY.value = withSpring(0, {
            damping: 25,
            stiffness: 400,
            mass: 0.5,
          });
          isDismissing.current = false;
        }
      },
    })
  ).current;

  const handleSkip = useCallback(
    (seconds: number) => {
      if (!onSeek) return;
      const durationMs = audioDuration || (song?.duration ? song.duration * 1000 : 0);
      if (!durationMs || durationMs <= 0) return;
      const newPositionMs = Math.max(0, Math.min(durationMs, (audioPosition || 0) + seconds * 1000));
      onSeek(newPositionMs / durationMs);
    },
    [onSeek, audioDuration, audioPosition, song]
  );

  const imageSource = useMemo(() => {
    if (!song?.thumbnailUrl) return null;
    return typeof song.thumbnailUrl === "string"
      ? { uri: song.thumbnailUrl }
      : song.thumbnailUrl;
  }, [song?.thumbnailUrl]);

  const albumArtSize = useMemo(() => {
    const screenWidth = Dimensions.get("window").width;
    const screenHeight = Dimensions.get("window").height;
    return Math.min(screenWidth * 0.65, screenHeight * 0.35, 280);
  }, []);

  if (!song) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <StatusBar barStyle="light-content" />
        <View style={{ flex: 1 }} {...dismissPanResponder.panHandlers}>
          <Animated.View
            style={[
              {
                flex: 1,
                paddingTop: Platform.OS === "ios" ? 50 : 40,
                paddingBottom: Platform.OS === "ios" ? 40 : 30,
              },
              modalAnimatedStyle,
            ]}
          >
            <SongModalPlayer
              song={song}
              albumArtSize={albumArtSize}
              imageSource={imageSource}
              isLiked={isLiked}
              likeCount={likeCount}
              viewCount={viewCount}
              isTogglingLike={isTogglingLike}
              isPlaying={!!isPlaying}
              isSeeking={isSeeking}
              seekProgress={seekProgress}
              audioProgress={audioProgress}
              audioDuration={audioDuration}
              audioPosition={audioPosition}
              repeatMode={repeatMode}
              isShuffled={isShuffled}
              isMuted={!!isMuted}
              progressBarRef={progressBarRef}
              panHandlers={panResponder.panHandlers}
              formatTime={formatTime}
              onClose={onClose}
              onOptionsPress={handleOptionsPress}
              onToggleLike={handleToggleLike}
              onTogglePlay={() => (onTogglePlay ? onTogglePlay() : onPlay?.(song))}
              onToggleMute={() => onToggleMute?.()}
              onSkip={handleSkip}
              onRepeatCycle={() => {
                if (repeatMode === "none") setRepeatMode("all");
                else if (repeatMode === "all") setRepeatMode("one");
                else setRepeatMode("none");
              }}
              onToggleShuffle={toggleShuffle}
              onOpenPlaylistView={() => setShowPlaylistView(true)}
            />
          </Animated.View>
        </View>
      </Modal>

      <SongModalPlaylistView
        visible={showPlaylistView}
        playlists={playlists}
        isLoadingPlaylists={isLoadingPlaylists}
        animatedStyle={playlistViewAnimatedStyle}
        onClose={() => setShowPlaylistView(false)}
        onSelectPlaylist={(playlist) => {
          setSelectedPlaylistForDetail(playlist);
          setShowPlaylistView(false);
          setShowPlaylistDetail(true);
        }}
      />

      <SongModalPlaylistSelection
        visible={showPlaylistModal}
        playlists={playlists}
        isLoadingPlaylists={isLoadingPlaylists}
        onClose={handleClosePlaylistModal}
        onCreateNew={async () => {
          await loadPlaylistsFromBackend();
          setShowCreatePlaylist(true);
          setShowPlaylistModal(false);
        }}
        onAddToPlaylist={handleAddToExistingPlaylist}
        onDeletePlaylist={handleDeletePlaylist}
      />

      <SongModalCreatePlaylist
        visible={showCreatePlaylist}
        playlistName={newPlaylistName}
        playlistDescription={newPlaylistDescription}
        isLoading={isLoadingPlaylists}
        onNameChange={setNewPlaylistName}
        onDescriptionChange={setNewPlaylistDescription}
        onCreate={handleCreatePlaylist}
        onCancel={() => {
          setShowCreatePlaylist(false);
          setNewPlaylistName("");
          setNewPlaylistDescription("");
        }}
      />

      <SongModalPlaylistDetail
        visible={showPlaylistDetail}
        playlist={selectedPlaylistForDetail}
        animatedStyle={playlistDetailAnimatedStyle}
        onClose={() => {
          setShowPlaylistDetail(false);
          setSelectedPlaylistForDetail(null);
        }}
        onBack={() => {
          setShowPlaylistDetail(false);
          setSelectedPlaylistForDetail(null);
          setTimeout(() => setShowPlaylistView(true), 100);
        }}
        onPlaySong={(s) => onPlay?.(s)}
      />

      <SongModalOptions
        visible={showOptionsModal}
        song={song}
        viewCount={viewCount}
        optionsSongData={optionsSongData}
        loadingOptionsSong={loadingOptionsSong}
        onClose={() => {
          setShowOptionsModal(false);
          setOptionsSongData(null);
        }}
        onAddToPlaylist={() => {
          setShowOptionsModal(false);
          setOptionsSongData(null);
          setShowPlaylistModal(true);
        }}
      />
    </>
  );
}
