import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    InteractionManager,
    Modal,
    PanResponder,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { AnimatedButton } from "../../src/shared/components/AnimatedButton";
import { UI_CONFIG } from "../../src/shared/constants";
import copyrightFreeMusicAPI from "../services/copyrightFreeMusicAPI";
import SocketManager from "../services/SocketManager";
import { usePlaylistStore, type Playlist } from "../store/usePlaylistStore";
import { getApiBaseUrl } from "../utils/api";
import { playlistAPI } from "../utils/playlistAPI";
import TokenUtils from "../utils/tokenUtils";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CopyrightFreeSongModalProps {
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
}

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
  formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  },
}: CopyrightFreeSongModalProps) {
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showPlaylistView, setShowPlaylistView] = useState(false); // New: View all playlists
  const [showPlaylistDetail, setShowPlaylistDetail] = useState(false); // New: View playlist songs
  const [selectedPlaylistForDetail, setSelectedPlaylistForDetail] = useState<Playlist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const progressBarRef = useRef<View>(null);
  
  // Like and Views state
  const [isLiked, setIsLiked] = useState(song?.isLiked || false);
  const [likeCount, setLikeCount] = useState(song?.likeCount || song?.likes || 0);
  const [viewCount, setViewCount] = useState(song?.viewCount || song?.views || 0);
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false); // Track if view has been recorded

  // Socket.IO manager for real-time updates (scoped to this modal)
  const socketManagerRef = useRef<SocketManager | null>(null);

  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    getAllPlaylists,
    loadPlaylistsFromBackend,
  } = usePlaylistStore();
  
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const playlistViewTranslateY = useSharedValue(SCREEN_HEIGHT);
  const playlistDetailTranslateY = useSharedValue(SCREEN_HEIGHT);

  // Load playlists from backend on mount and when playlist modal opens
  useEffect(() => {
    if (visible) {
      loadPlaylistsFromBackend();
    }
  }, [visible, loadPlaylistsFromBackend]);

  // Update like and view counts when song changes
  useEffect(() => {
    if (song) {
      setIsLiked(song.isLiked || false);
      setLikeCount(song.likeCount || song.likes || 0);
      setViewCount(song.viewCount || song.views || 0);
      // Reset view tracking when song changes
      setHasTrackedView(false);
    }
  }, [song]);

  // View tracking: Record view when engagement thresholds are met
  // Thresholds: 3 seconds OR 25% progress OR completion
  useEffect(() => {
    const songId = song?._id || song?.id;
    if (!visible || !songId || hasTrackedView || !isPlaying) {
      return;
    }

    const durationMs = audioDuration || (song?.duration ? song.duration * 1000 : 0);
    const positionMs = audioPosition || 0;
    const progressPct = audioProgress ? Math.round(audioProgress * 100) : 0;
    const isComplete = durationMs > 0 && audioProgress >= 0.999;

    // Check if engagement threshold is met
    const meetsThreshold =
      positionMs >= 3000 || // 3 seconds
      progressPct >= 25 || // 25% progress
      isComplete; // Song completed

    if (meetsThreshold) {
      // Record view with backend API
      (async () => {
        try {
          const result = await copyrightFreeMusicAPI.recordView(songId, {
            durationMs: isComplete ? durationMs : positionMs,
            progressPct: progressPct,
            isComplete: isComplete,
          });

          if (result.success && result.data) {
            // Update view count from backend response
            setViewCount(result.data.viewCount);
            setHasTrackedView(true);
            console.log(`✅ View recorded for song ${songId}:`, {
              viewCount: result.data.viewCount,
              hasViewed: result.data.hasViewed,
            });
          }
        } catch (error) {
          // Silently handle errors (view tracking is non-critical)
          console.warn("⚠️ Failed to record view:", error);
        }
      })();
    }
  }, [
    visible,
    song?._id,
    song?.id,
    song?.duration,
    isPlaying,
    audioPosition,
    audioProgress,
    audioDuration,
    hasTrackedView,
  ]);

  // Real-time updates via Socket.IO for this song
  useEffect(() => {
    const songId = song?._id || song?.id;
    if (!visible || !songId) {
      return;
    }

    let isActive = true;
    let socket: any = null;
    let handleRealtimeUpdate: ((data: any) => void) | null = null;

    const initSocket = async () => {
      try {
        const token = await TokenUtils.getAuthToken();
        if (!token || !isActive) return;

        const manager = new SocketManager({
          serverUrl: getApiBaseUrl(),
          authToken: token,
        });

        socketManagerRef.current = manager;

        await manager.connect();
        if (!isActive) {
          manager.disconnect();
          socketManagerRef.current = null;
          return;
        }

        // Access underlying socket instance for custom event
        socket = (manager as any).socket;
        if (!socket) {
          return;
        }

        // Join a content room so backend can target this song specifically
        try {
          manager.joinContentRoom(songId, "audio");
        } catch (e) {
          console.warn("⚠️ Failed to join real-time room for song:", e);
        }

        handleRealtimeUpdate = (data: any) => {
          try {
            if (!data || data.songId !== songId) return;

            // Backend WebSocket event format: { songId, likeCount, viewCount, liked }
            if (typeof data.likeCount === "number") {
              setLikeCount((prev: number) =>
                Number.isFinite(data.likeCount) ? data.likeCount : prev
              );
            }

            if (typeof data.viewCount === "number") {
              setViewCount((prev: number) =>
                Number.isFinite(data.viewCount) ? data.viewCount : prev
              );
            }

            if (typeof data.liked === "boolean") {
              setIsLiked(data.liked);
            }
          } catch (e) {
            console.warn("⚠️ Error applying real-time song update:", e);
          }
        };

        socket.on(
          "copyright-free-song-interaction-updated",
          handleRealtimeUpdate
        );
      } catch (error) {
        console.warn(
          "⚠️ Failed to initialize real-time updates for copyright-free song:",
          error
        );
      }
    };

    initSocket();

    return () => {
      isActive = false;

      if (socket && handleRealtimeUpdate) {
        socket.off(
          "copyright-free-song-interaction-updated",
          handleRealtimeUpdate
        );
      }

      // Disconnect and leave room when modal closes or song changes
      const manager = socketManagerRef.current;
      if (manager) {
        try {
          if (songId) {
            manager.leaveContentRoom(songId, "audio");
          }
        } catch {}
        manager.disconnect();
        socketManagerRef.current = null;
      }
    };
  }, [visible, song?._id, song?.id]);

  // Refresh playlists when playlist modal opens (only when opening, not closing)
  const prevShowPlaylistModalRef = useRef(false);
  useEffect(() => {
    // Only load when modal transitions from closed to open
    if (showPlaylistModal && !prevShowPlaylistModalRef.current) {
      // Defer the load to avoid blocking the modal opening animation
      InteractionManager.runAfterInteractions(() => {
        loadPlaylistsFromBackend();
      });
    }
    prevShowPlaylistModalRef.current = showPlaylistModal;
  }, [showPlaylistModal, loadPlaylistsFromBackend]);

  // Smooth modal animations - no bouncing
  useEffect(() => {
    if (showPlaylistView) {
      playlistViewTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
        overshootClamping: true,
      });
    } else {
      playlistViewTranslateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
      });
    }
  }, [showPlaylistView, playlistViewTranslateY]);

  useEffect(() => {
    if (showPlaylistDetail) {
      playlistDetailTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
        overshootClamping: true,
      });
    } else {
      playlistDetailTranslateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
      });
    }
  }, [showPlaylistDetail, playlistDetailTranslateY]);

  const playlistViewAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistViewTranslateY.value }],
  }));

  const playlistDetailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: playlistDetailTranslateY.value }],
  }));

  // Pan responder for seekable progress bar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSeeking(true);
        setSeekProgress(audioProgress);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (progressBarRef.current) {
          progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
            const touchX = evt.nativeEvent.locationX;
            const progress = Math.max(0, Math.min(1, touchX / width));
            setSeekProgress(progress);
          });
        }
      },
      onPanResponderRelease: (evt) => {
        setIsSeeking(false);
        if (progressBarRef.current && onSeek) {
          progressBarRef.current.measure((x, y, width) => {
            const touchX = evt.nativeEvent.locationX;
            const progress = Math.max(0, Math.min(1, touchX / width));
            onSeek(progress);
          });
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
        overshootClamping: true, // Prevents overshooting/bouncing
      });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 30,
        stiffness: 300,
        mass: 0.8,
      });
    }
  }, [visible, translateY]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleAddToPlaylist = useCallback(() => {
    if (!song) return;
    setShowPlaylistModal(true);
  }, [song]);

  // Optimized close handler for playlist modal
  const handleClosePlaylistModal = useCallback(() => {
    // Immediately update state for instant UI feedback
    setShowPlaylistModal(false);
  }, []);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Please enter a playlist name");
      return;
    }

    try {
      setIsLoadingPlaylists(true);
      
      // Create playlist via backend API
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
      
      // Clear form
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      
      // Close create modal
      setShowCreatePlaylist(false);
      
      // Refresh playlists from backend FIRST to ensure new playlist is loaded
      await loadPlaylistsFromBackend();
      
      // Automatically add the current song to the new playlist if song exists
      if (song) {
        // Add song to the newly created playlist
        const songId = song._id || song.id;
        if (songId) {
          const addResult = await playlistAPI.addTrackToPlaylist(playlistId, {
            copyrightFreeSongId: songId,
            position: undefined,
          });

          if (addResult.success) {
            // Refresh playlists again to get updated song counts
            await loadPlaylistsFromBackend();
            // Close playlist modal and show success
            setShowPlaylistModal(false);
            Alert.alert("Success", "Playlist created and song added!");
          } else {
            // If adding song fails, still show playlist modal with new playlist
            setShowPlaylistModal(true);
            Alert.alert("Success", "Playlist created! But failed to add song.");
          }
        } else {
          // No valid song ID, just reopen playlist modal
          setShowPlaylistModal(true);
          Alert.alert("Success", "Playlist created!");
        }
      } else {
        // If no song, reopen the playlist selection modal to show the new playlist
        setShowPlaylistModal(true);
        Alert.alert("Success", "Playlist created!");
      }
      
      setIsLoadingPlaylists(false);
    } catch (error) {
      console.error("Error creating playlist:", error);
      Alert.alert("Error", "Failed to create playlist");
      setIsLoadingPlaylists(false);
    }
  };

  const handleAddToExistingPlaylist = async (playlistId: string) => {
    if (!song) return;

    try {
      setIsLoadingPlaylists(true);

      // Add track via backend API using copyrightFreeSongId
      // Handle both id and _id formats
      const songId = song._id || song.id;
      if (!songId) {
        Alert.alert("Error", "Invalid song ID");
        setIsLoadingPlaylists(false);
        return;
      }

      const result = await playlistAPI.addTrackToPlaylist(playlistId, {
        copyrightFreeSongId: songId,
        position: undefined, // Add to end
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

      // Refresh playlists from backend
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
  };

  const handleToggleLike = async () => {
    if (!song || isTogglingLike) return;

    const songId = song._id || song.id;
    if (!songId) {
      console.warn("⚠️ Cannot toggle like: Invalid song ID");
      return;
    }

    try {
      setIsTogglingLike(true);
      
      // Optimistic update
      const previousLiked = isLiked;
      const previousLikeCount = likeCount;
      setIsLiked(!previousLiked);
      setLikeCount(previousLiked ? previousLikeCount - 1 : previousLikeCount + 1);

      // Call API
      const result = await copyrightFreeMusicAPI.toggleLike(songId);

      if (result.success && result.data) {
        setIsLiked(result.data.liked);
        setLikeCount(result.data.likeCount);
        if (result.data.viewCount !== undefined) {
          setViewCount(result.data.viewCount);
        }
      } else {
        // Revert optimistic update on error
        setIsLiked(previousLiked);
        setLikeCount(previousLikeCount);
        Alert.alert("Error", "Failed to update like");
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update
      setIsLiked(isLiked);
      setLikeCount(likeCount);
      Alert.alert("Error", "Failed to update like");
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    Alert.alert(
      "Delete Playlist",
      "Are you sure you want to delete this playlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoadingPlaylists(true);
              const result = await playlistAPI.deletePlaylist(playlistId);
              
              if (result.success) {
                // Refresh playlists from backend
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
      ]
    );
  };

  // Skip forward/backward helper (in seconds)
  const handleSkip = useCallback(
    (seconds: number) => {
      if (!onSeek) {
        return;
      }

      const durationMs = audioDuration || (song?.duration ? song.duration * 1000 : 0);
      if (!durationMs || durationMs <= 0) {
        return;
      }

      const newPositionMs = Math.max(
        0,
        Math.min(durationMs, (audioPosition || 0) + seconds * 1000)
      );
      const newProgress = newPositionMs / durationMs;
      onSeek(newProgress);
    },
    [onSeek, audioDuration, audioPosition, song]
  );

  if (!song) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Animated.View
            style={[
              {
                backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
                borderRadius: 32,
                width: "92%",
                maxHeight: SCREEN_HEIGHT * 0.9,
                paddingTop: UI_CONFIG.SPACING.MD,
                paddingBottom: UI_CONFIG.SPACING.XL,
              },
              modalAnimatedStyle,
            ]}
          >
            {/* Header - Now Playing style */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: UI_CONFIG.SPACING.LG,
                paddingVertical: UI_CONFIG.SPACING.SM,
              }}
            >
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: UI_CONFIG.COLORS.SURFACE,
                }}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={UI_CONFIG.COLORS.TEXT_PRIMARY}
                />
              </TouchableOpacity>

              <Text
                style={{
                  fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                  fontFamily: "Rubik-SemiBold",
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                }}
              >
                Now Playing
              </Text>

              <TouchableOpacity
                onPress={handleAddToPlaylist}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: UI_CONFIG.COLORS.SURFACE,
                }}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={18}
                  color={UI_CONFIG.COLORS.TEXT_PRIMARY}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: UI_CONFIG.SPACING.LG,
                paddingTop: UI_CONFIG.SPACING.LG,
              }}
            >
              {/* Artwork */}
              <View
                style={{
                  alignItems: "center",
                  marginBottom: UI_CONFIG.SPACING.XL,
                }}
              >
                {/** Support both backend URL strings and local require() thumbnails */}
                {song?.thumbnailUrl && (
                  <Image
                    source={
                      typeof song.thumbnailUrl === "string"
                        ? { uri: song.thumbnailUrl }
                        : song.thumbnailUrl
                    }
                    style={{
                      width: 260,
                      height: 260,
                      borderRadius: 32,
                    }}
                    resizeMode="cover"
                  />
                )}
              </View>

              {/* Song Info */}
              <View
                style={{
                  alignItems: "center",
                  marginBottom: UI_CONFIG.SPACING.LG,
                }}
              >
                <Text
                  style={{
                    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XL,
                    fontFamily: "Rubik-SemiBold",
                    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                    marginBottom: 4,
                    textAlign: "center",
                  }}
                  numberOfLines={2}
                >
                  {song.title}
                </Text>
                <Text
                  style={{
                    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                    fontFamily: "Rubik",
                    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                    marginBottom: 4,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {song.artist}
                </Text>
                {song.category && (
                  <Text
                    style={{
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
                      fontFamily: "Rubik",
                      color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                      marginBottom: UI_CONFIG.SPACING.MD,
                    }}
                    numberOfLines={1}
                  >
                    {song.category}
                  </Text>
                )}

                {/* Like and Views Icons */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: UI_CONFIG.SPACING.LG,
                    marginTop: UI_CONFIG.SPACING.SM,
                  }}
                >
                  {/* Like Icon */}
                  <TouchableOpacity
                    onPress={handleToggleLike}
                    disabled={isTogglingLike}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: UI_CONFIG.SPACING.MD,
                      paddingVertical: UI_CONFIG.SPACING.SM,
                      borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
                      backgroundColor: isLiked 
                        ? UI_CONFIG.COLORS.ERROR + "15" 
                        : UI_CONFIG.COLORS.SURFACE,
                    }}
                  >
                    <Ionicons
                      name={isLiked ? "heart" : "heart-outline"}
                      size={20}
                      color={isLiked ? UI_CONFIG.COLORS.ERROR : UI_CONFIG.COLORS.TEXT_SECONDARY}
                    />
                    <Text
                      style={{
                        fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                        fontFamily: "Rubik-SemiBold",
                        color: isLiked ? UI_CONFIG.COLORS.ERROR : UI_CONFIG.COLORS.TEXT_SECONDARY,
                      }}
                    >
                      {likeCount > 0 ? likeCount.toLocaleString() : "0"}
                    </Text>
                  </TouchableOpacity>

                  {/* Views Icon */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: UI_CONFIG.SPACING.MD,
                      paddingVertical: UI_CONFIG.SPACING.SM,
                      borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
                      backgroundColor: UI_CONFIG.COLORS.SURFACE,
                    }}
                  >
                    <Ionicons
                      name="eye-outline"
                      size={20}
                      color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                    />
                    <Text
                      style={{
                        fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                        fontFamily: "Rubik-SemiBold",
                        color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                      }}
                    >
                      {viewCount > 0 ? viewCount.toLocaleString() : "0"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Progress + controls */}
              <View style={{ marginBottom: UI_CONFIG.SPACING.XL }}>
                {/* Progress bar with draggable thumb for easier scrubbing */}
                <View
                  ref={progressBarRef}
                  style={{
                    height: 20, // taller touch area for bigger fingers
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                  {...panResponder.panHandlers}
                >
                  {/* Track */}
                  <View
                    style={{
                      height: 4,
                      borderRadius: 999,
                      backgroundColor: UI_CONFIG.COLORS.SURFACE,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        width: `${
                          (isSeeking ? seekProgress : audioProgress) * 100
                        }%`,
                        backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                      }}
                    />
                  </View>
                  {/* Thumb/handle */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: `${
                        (isSeeking ? seekProgress : audioProgress) * 100
                      }%`,
                      transform: [{ translateX: -10 }],
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 2,
                        borderColor: UI_CONFIG.COLORS.SECONDARY,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.5,
                        elevation: 4,
                      }}
                    />
                  </View>
                </View>

                {/* Time row */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: UI_CONFIG.SPACING.LG,
                  }}
                >
                  <Text
                    style={{
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
                      fontFamily: "Rubik",
                      color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                    }}
                  >
                    {formatTime(
                      isSeeking
                        ? seekProgress * (audioDuration || song.duration * 1000)
                        : audioPosition
                    )}
                  </Text>
                  <Text
                    style={{
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
                      fontFamily: "Rubik",
                      color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                    }}
                  >
                    {formatTime(audioDuration || song.duration * 1000)}
                  </Text>
                </View>

                {/* Transport controls (with skip back/forward using seek) */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: UI_CONFIG.SPACING.XL,
                  }}
                >
                  {/* Skip back 15 seconds */}
                  <AnimatedButton onPress={() => handleSkip(-15)}>
                    <Ionicons
                      name="play-skip-back"
                      size={24}
                      color={UI_CONFIG.COLORS.TEXT_PRIMARY}
                    />
                  </AnimatedButton>

                  <AnimatedButton
                    onPress={onTogglePlay || (() => onPlay?.(song))}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: UI_CONFIG.COLORS.PRIMARY, // Jevah green
                      justifyContent: "center",
                      alignItems: "center",
                      ...UI_CONFIG.SHADOWS.MD,
                    }}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={32}
                      color="#FFFFFF"
                    />
                  </AnimatedButton>

                  {/* Skip forward 15 seconds */}
                  <AnimatedButton onPress={() => handleSkip(15)}>
                    <Ionicons
                      name="play-skip-forward"
                      size={24}
                      color={UI_CONFIG.COLORS.TEXT_PRIMARY}
                    />
                  </AnimatedButton>
                </View>
              </View>

              {/* Bottom row: mute + playlist pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <AnimatedButton onPress={onToggleMute}>
                  <Ionicons
                    name={isMuted ? "volume-mute" : "volume-high"}
                    size={22}
                    color={UI_CONFIG.COLORS.TEXT_PRIMARY}
                  />
                </AnimatedButton>

                <AnimatedButton
                  onPress={() => setShowPlaylistView(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: UI_CONFIG.SPACING.LG,
                    paddingVertical: UI_CONFIG.SPACING.SM,
                    borderRadius: 999,
                    backgroundColor: UI_CONFIG.COLORS.SURFACE,
                  }}
                >
                  <Ionicons
                    name="list"
                    size={18}
                    color={UI_CONFIG.COLORS.TEXT_PRIMARY}
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                      fontFamily: "Rubik",
                      color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                    }}
                  >
                    Playlist
                  </Text>
                  <Ionicons
                    name="chevron-up"
                    size={16}
                    color={UI_CONFIG.COLORS.TEXT_PRIMARY}
                    style={{ marginLeft: 4 }}
                  />
                </AnimatedButton>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Playlist Selection Modal */}
      <Modal
        visible={showPlaylistModal}
        transparent
        animationType="fade"
        onRequestClose={handleClosePlaylistModal}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleClosePlaylistModal}
          style={{ flex: 1 }}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md max-h-[80%]"
            >
              {/* Header */}
              <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
                <Text className="text-lg font-rubik-bold text-gray-900">
                  Add to Playlist
                </Text>
                <TouchableOpacity 
                  onPress={handleClosePlaylistModal}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16 }}
            >
              {/* Create New Playlist Button - Matches app theme */}
              <AnimatedButton
                onPress={async () => {
                  // Refresh playlists before opening create modal
                  await loadPlaylistsFromBackend();
                  setShowCreatePlaylist(true);
                  setShowPlaylistModal(false);
                }}
                style={{
                  backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                  paddingVertical: UI_CONFIG.SPACING.MD,
                  borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
                  marginBottom: UI_CONFIG.SPACING.LG,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  ...UI_CONFIG.SHADOWS.MD,
                }}
              >
                <Ionicons name="add-circle" size={22} color="#FFFFFF" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Rubik-SemiBold",
                    marginLeft: 8,
                    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                  }}
                >
                  Create New Playlist
                </Text>
              </AnimatedButton>

              {/* Existing Playlists */}
              {isLoadingPlaylists ? (
                <View className="py-8 items-center">
                  <Text className="text-center text-gray-500 font-rubik">
                    Loading playlists...
                  </Text>
                </View>
              ) : playlists.length === 0 ? (
                <Text className="text-center text-gray-500 font-rubik py-8">
                  No playlists yet. Create one to get started!
                </Text>
              ) : (
                <View className="gap-2">
                  {playlists.map((playlist) => (
                    <View
                      key={playlist.id}
                      className="flex-row items-center justify-between p-4 bg-white border border-gray-200 rounded-xl mb-3 shadow-sm"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                      }}
                    >
                      <View className="flex-1 mr-3">
                        <Text className="font-rubik-bold text-gray-900 text-base">
                          {playlist.name}
                        </Text>
                        {playlist.description && (
                          <Text className="text-sm text-gray-500 font-rubik mt-1">
                            {playlist.description}
                          </Text>
                        )}
                        <View className="flex-row items-center mt-2">
                          <Ionicons name="musical-notes" size={14} color="#9CA3AF" />
                          <Text className="text-xs text-gray-400 font-rubik ml-1">
                            {playlist.songs.length} song
                            {playlist.songs.length !== 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <AnimatedButton
                          onPress={() => handleAddToExistingPlaylist(playlist.id)}
                          style={{
                            backgroundColor: UI_CONFIG.COLORS.SUCCESS,
                            paddingHorizontal: UI_CONFIG.SPACING.LG,
                            paddingVertical: 10,
                            borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontFamily: "Rubik-SemiBold",
                              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                            }}
                          >
                            Add
                          </Text>
                        </AnimatedButton>
                        <AnimatedButton
                          onPress={() => handleDeletePlaylist(playlist.id)}
                          style={{
                            backgroundColor: UI_CONFIG.COLORS.ERROR,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                        </AnimatedButton>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Playlist Modal - Sleek Spotify-like Design */}
      <Modal
        visible={showCreatePlaylist}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCreatePlaylist(false);
          setNewPlaylistName("");
          setNewPlaylistDescription("");
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setShowCreatePlaylist(false);
            setNewPlaylistName("");
            setNewPlaylistDescription("");
          }}
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              width: "100%",
              maxWidth: 420,
              paddingTop: 28,
              paddingBottom: 24,
              paddingHorizontal: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 24,
              elevation: 16,
            }}
          >
            {/* Header with Close Button */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: "Rubik-Bold",
                  color: "#111827",
                  letterSpacing: -0.5,
                }}
              >
                Create playlist
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreatePlaylist(false);
                  setNewPlaylistName("");
                  setNewPlaylistDescription("");
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F3F4F6",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Playlist Name Input */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik-SemiBold",
                  color: "#374151",
                  marginBottom: 8,
                  letterSpacing: 0.2,
                }}
              >
                Playlist name
              </Text>
              <TextInput
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                placeholder="My playlist"
                placeholderTextColor="#9CA3AF"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  fontFamily: "Rubik",
                  color: "#111827",
                }}
                autoFocus
              />
            </View>

            {/* Description Input */}
            <View style={{ marginBottom: 28 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik-SemiBold",
                  color: "#374151",
                  marginBottom: 8,
                  letterSpacing: 0.2,
                }}
              >
                Description <Text style={{ color: "#9CA3AF", fontWeight: "400" }}>(optional)</Text>
              </Text>
              <TextInput
                value={newPlaylistDescription}
                onChangeText={setNewPlaylistDescription}
                placeholder="Add a description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  fontFamily: "Rubik",
                  color: "#111827",
                  minHeight: 80,
                }}
              />
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowCreatePlaylist(false);
                  setNewPlaylistName("");
                  setNewPlaylistDescription("");
                }}
                disabled={isLoadingPlaylists}
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isLoadingPlaylists ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Rubik-SemiBold",
                    color: "#374151",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreatePlaylist}
                disabled={isLoadingPlaylists || !newPlaylistName.trim()}
                style={{
                  flex: 1,
                  backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isLoadingPlaylists || !newPlaylistName.trim() ? 0.6 : 1,
                  shadowColor: UI_CONFIG.COLORS.SECONDARY,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {isLoadingPlaylists ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "Rubik-SemiBold",
                        color: "#FFFFFF",
                      }}
                    >
                      Creating...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Rubik-SemiBold",
                      color: "#FFFFFF",
                    }}
                  >
                    Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Playlist View Modal - Shows all playlists */}
      <Modal
        visible={showPlaylistView}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPlaylistView(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <Animated.View
            style={[
              {
                backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
                borderTopLeftRadius: UI_CONFIG.BORDER_RADIUS.XL,
                borderTopRightRadius: UI_CONFIG.BORDER_RADIUS.XL,
                maxHeight: SCREEN_HEIGHT * 0.85,
                paddingTop: UI_CONFIG.SPACING.MD,
              },
              playlistViewAnimatedStyle,
            ]}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: UI_CONFIG.SPACING.MD,
                paddingVertical: UI_CONFIG.SPACING.MD,
                borderBottomWidth: 1,
                borderBottomColor: UI_CONFIG.COLORS.BORDER,
              }}
            >
              <Text
                style={{
                  fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XL,
                  fontFamily: "Rubik-SemiBold",
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                }}
              >
                My Playlists
              </Text>
              <TouchableOpacity
                onPress={() => setShowPlaylistView(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: UI_CONFIG.COLORS.SURFACE,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: UI_CONFIG.SPACING.MD,
                paddingBottom: UI_CONFIG.SPACING.XL,
              }}
            >
              {playlists.length === 0 ? (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: UI_CONFIG.SPACING.XXL,
                  }}
                >
                  <Ionicons
                    name="musical-notes-outline"
                    size={64}
                    color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                  />
                  <Text
                    style={{
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                      fontFamily: "Rubik-SemiBold",
                      color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                      marginTop: UI_CONFIG.SPACING.MD,
                    }}
                  >
                    {isLoadingPlaylists ? "Loading playlists..." : "No Playlists Yet"}
                  </Text>
                  {!isLoadingPlaylists && (
                    <Text
                      style={{
                        fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                        fontFamily: "Rubik",
                        color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                        marginTop: UI_CONFIG.SPACING.SM,
                        textAlign: "center",
                      }}
                    >
                      Create a playlist to organize your favorite songs
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{ gap: UI_CONFIG.SPACING.MD }}>
                  {playlists.map((playlist) => (
                    <TouchableOpacity
                      key={playlist.id}
                      onPress={() => {
                        setSelectedPlaylistForDetail(playlist);
                        setShowPlaylistView(false);
                        setShowPlaylistDetail(true);
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: UI_CONFIG.COLORS.SURFACE,
                        borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
                        padding: UI_CONFIG.SPACING.MD,
                        borderWidth: 1,
                        borderColor: UI_CONFIG.COLORS.BORDER,
                        ...UI_CONFIG.SHADOWS.SM,
                      }}
                    >
                      {/* Playlist Thumbnail or Icon */}
                      <View
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                          backgroundColor: UI_CONFIG.COLORS.SECONDARY + "20",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: UI_CONFIG.SPACING.MD,
                          overflow: "hidden",
                        }}
                      >
                        {playlist.thumbnailUrl ? (
                          <Image
                            source={playlist.thumbnailUrl}
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                            }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={require("../../assets/images/Jevah.png")}
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                            }}
                            resizeMode="cover"
                          />
                        )}
                      </View>

                      {/* Playlist Info */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                            fontFamily: "Rubik-SemiBold",
                            color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                          }}
                          numberOfLines={1}
                        >
                          {playlist.name}
                        </Text>
                        {playlist.description && (
                          <Text
                            style={{
                              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                              fontFamily: "Rubik",
                              color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                              marginTop: 4,
                            }}
                            numberOfLines={1}
                          >
                            {playlist.description}
                          </Text>
                        )}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 4,
                          }}
                        >
                          <Ionicons
                            name="musical-note"
                            size={12}
                            color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                          />
                          <Text
                            style={{
                              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
                              fontFamily: "Rubik",
                              color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                              marginLeft: 4,
                            }}
                          >
                            {playlist.songs.length} song
                            {playlist.songs.length !== 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>

                      {/* Arrow Icon */}
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Playlist Detail Modal - Shows songs in a playlist */}
      <Modal
        visible={showPlaylistDetail}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPlaylistDetail(false);
          setSelectedPlaylistForDetail(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <Animated.View
            style={[
              {
                backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
                borderTopLeftRadius: UI_CONFIG.BORDER_RADIUS.XL,
                borderTopRightRadius: UI_CONFIG.BORDER_RADIUS.XL,
                maxHeight: SCREEN_HEIGHT * 0.85,
                paddingTop: UI_CONFIG.SPACING.MD,
              },
              playlistDetailAnimatedStyle,
            ]}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: UI_CONFIG.SPACING.MD,
                paddingVertical: UI_CONFIG.SPACING.MD,
                borderBottomWidth: 1,
                borderBottomColor: UI_CONFIG.COLORS.BORDER,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  setShowPlaylistDetail(false);
                  setSelectedPlaylistForDetail(null);
                  // Small delay to allow close animation before opening playlist view
                  setTimeout(() => {
                    setShowPlaylistView(true);
                  }, 100);
                }}
                style={{ marginRight: UI_CONFIG.SPACING.MD }}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={UI_CONFIG.COLORS.TEXT_PRIMARY}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XL,
                    fontFamily: "Rubik-SemiBold",
                    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                  }}
                  numberOfLines={1}
                >
                  {selectedPlaylistForDetail?.name || "Playlist"}
                </Text>
                {selectedPlaylistForDetail?.description && (
                  <Text
                    style={{
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                      fontFamily: "Rubik",
                      color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                      marginTop: 4,
                    }}
                    numberOfLines={1}
                  >
                    {selectedPlaylistForDetail.description}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowPlaylistDetail(false);
                  setSelectedPlaylistForDetail(null);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: UI_CONFIG.COLORS.SURFACE,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: UI_CONFIG.SPACING.MD,
                paddingBottom: UI_CONFIG.SPACING.XL,
              }}
            >
              {!selectedPlaylistForDetail ||
              selectedPlaylistForDetail.songs.length === 0 ? (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: UI_CONFIG.SPACING.XXL,
                  }}
                >
                  <Ionicons
                    name="musical-notes-outline"
                    size={64}
                    color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                  />
                  <Text
                    style={{
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                      fontFamily: "Rubik-SemiBold",
                      color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                      marginTop: UI_CONFIG.SPACING.MD,
                    }}
                  >
                    No Songs Yet
                  </Text>
                  <Text
                    style={{
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                      fontFamily: "Rubik",
                      color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                      marginTop: UI_CONFIG.SPACING.SM,
                      textAlign: "center",
                    }}
                  >
                    Add songs to this playlist to get started
                  </Text>
                </View>
              ) : (
                <View style={{ gap: UI_CONFIG.SPACING.SM }}>
                  {selectedPlaylistForDetail.songs.map((playlistSong, index) => (
                    <TouchableOpacity
                      key={playlistSong.id}
                      onPress={() => {
                        // Close playlist detail and trigger play for this song
                        setShowPlaylistDetail(false);
                        setSelectedPlaylistForDetail(null);
                        if (onPlay) {
                          onPlay({
                            ...playlistSong,
                            audioUrl: playlistSong.audioUrl,
                            thumbnailUrl: playlistSong.thumbnailUrl,
                          });
                        }
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: UI_CONFIG.COLORS.SURFACE,
                        borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                        padding: UI_CONFIG.SPACING.MD,
                        borderWidth: 1,
                        borderColor: UI_CONFIG.COLORS.BORDER,
                      }}
                    >
                      {/* Song Number */}
                      <Text
                        style={{
                          fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                          fontFamily: "Rubik-SemiBold",
                          color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                          width: 24,
                          textAlign: "center",
                        }}
                      >
                        {index + 1}
                      </Text>

                      {/* Song Thumbnail */}
                      <Image
                        source={playlistSong.thumbnailUrl}
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                          marginLeft: UI_CONFIG.SPACING.MD,
                          marginRight: UI_CONFIG.SPACING.MD,
                        }}
                        resizeMode="cover"
                      />

                      {/* Song Info */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                            fontFamily: "Rubik-SemiBold",
                            color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                          }}
                          numberOfLines={1}
                        >
                          {playlistSong.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                            fontFamily: "Rubik",
                            color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {playlistSong.artist}
                        </Text>
                      </View>

                      {/* Play Icon */}
                      <AnimatedButton
                        onPress={() => {
                          if (onPlay) {
                            onPlay({
                              ...playlistSong,
                              audioUrl: playlistSong.audioUrl,
                              thumbnailUrl: playlistSong.thumbnailUrl,
                            });
                          }
                        }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                          justifyContent: "center",
                          alignItems: "center",
                          marginLeft: UI_CONFIG.SPACING.SM,
                        }}
                      >
                        <Ionicons name="play" size={20} color="#FFFFFF" />
                      </AnimatedButton>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

