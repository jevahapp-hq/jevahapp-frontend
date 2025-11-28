import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
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
import { usePlaylistStore, type Playlist, type PlaylistSong } from "../store/usePlaylistStore";
import { AnimatedButton } from "../../src/shared/components/AnimatedButton";
import { UI_CONFIG } from "../../src/shared/constants";

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

  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    getAllPlaylists,
  } = usePlaylistStore();

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const playlistViewTranslateY = useSharedValue(SCREEN_HEIGHT);
  const playlistDetailTranslateY = useSharedValue(SCREEN_HEIGHT);

  // Load playlists on mount
  useEffect(() => {
    if (visible) {
      usePlaylistStore.getState().loadPlaylists();
    }
  }, [visible]);

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

  const handleAddToPlaylist = () => {
    if (!song) return;
    setShowPlaylistModal(true);
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Please enter a playlist name");
      return;
    }

    const playlistId = createPlaylist(newPlaylistName.trim(), newPlaylistDescription.trim());
    
    // Automatically add the current song to the new playlist
    if (song) {
      const playlistSong: PlaylistSong = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        audioUrl: song.audioUrl,
        thumbnailUrl: song.thumbnailUrl,
        duration: song.duration,
        category: song.category,
        description: song.description,
        addedAt: new Date().toISOString(),
      };
      addSongToPlaylist(playlistId, playlistSong);
    }

    setNewPlaylistName("");
    setNewPlaylistDescription("");
    setShowCreatePlaylist(false);
    setShowPlaylistModal(false);
    Alert.alert("Success", "Playlist created and song added!");
  };

  const handleAddToExistingPlaylist = (playlistId: string) => {
    if (!song) return;

    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    // Check if song already exists
    const songExists = playlist.songs.some((s) => s.id === song.id);
    if (songExists) {
      Alert.alert("Info", "This song is already in the playlist");
      return;
    }

    const playlistSong: PlaylistSong = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      audioUrl: song.audioUrl,
      thumbnailUrl: song.thumbnailUrl,
      duration: song.duration,
      category: song.category,
      description: song.description,
      addedAt: new Date().toISOString(),
    };

    const success = addSongToPlaylist(playlistId, playlistSong);
    if (success) {
      setShowPlaylistModal(false);
      Alert.alert("Success", "Song added to playlist!");
    } else {
      Alert.alert("Error", "Failed to add song to playlist");
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    Alert.alert(
      "Delete Playlist",
      "Are you sure you want to delete this playlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deletePlaylist(playlistId);
            Alert.alert("Success", "Playlist deleted");
          },
        },
      ]
    );
  };

  if (!song) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <Animated.View
            style={[
              {
                backgroundColor: "white",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: SCREEN_HEIGHT * 0.9,
                paddingTop: 16,
              },
              modalAnimatedStyle,
            ]}
          >
            {/* Header - Matches app theme */}
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
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                    fontFamily: "Rubik-SemiBold",
                    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                  }}
                >
                  Audio Library
                </Text>
                <Text
                  style={{
                    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
                    fontFamily: "Rubik",
                    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                    marginTop: 4,
                  }}
                >
                  Copyright-free music
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
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
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Song Thumbnail - YouTube-style larger */}
              <View className="items-center mt-6 mb-6">
                <Image
                  source={song.thumbnailUrl}
                  className="w-56 h-56 rounded-2xl shadow-lg"
                  resizeMode="cover"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                  }}
                />
              </View>

              {/* Song Info */}
              <View className="px-4 mb-6">
                <Text className="text-2xl font-rubik-bold text-center mb-2">
                  {song.title}
                </Text>
                <Text className="text-lg text-gray-600 font-rubik text-center mb-1">
                  {song.artist}
                </Text>
                {song.category && (
                  <Text className="text-sm text-gray-500 font-rubik text-center mb-4">
                    {song.category}
                  </Text>
                )}
                {song.description && (
                  <Text className="text-sm text-gray-700 font-rubik text-center leading-5">
                    {song.description}
                  </Text>
                )}
                <View className="flex-row items-center justify-center mt-4 gap-4">
                  <View className="flex-row items-center">
                    <Ionicons name="eye-outline" size={16} color="#9CA3AF" />
                    <Text className="text-xs text-gray-500 ml-1 font-rubik">
                      {song.views || 0} views
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="heart-outline" size={16} color="#9CA3AF" />
                    <Text className="text-xs text-gray-500 ml-1 font-rubik">
                      {song.likes || 0} likes
                    </Text>
                  </View>
                </View>
              </View>

              {/* Audio Player - Matches app theme */}
              <View
                style={{
                  paddingHorizontal: UI_CONFIG.SPACING.MD,
                  marginBottom: UI_CONFIG.SPACING.LG,
                  backgroundColor: UI_CONFIG.COLORS.SURFACE,
                  borderRadius: UI_CONFIG.BORDER_RADIUS.XL,
                  paddingVertical: UI_CONFIG.SPACING.MD,
                }}
              >
                <View className="flex-row items-center mb-4">
                  <AnimatedButton
                    onPress={onTogglePlay || (() => onPlay?.(song))}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: UI_CONFIG.COLORS.SECONDARY, // #FEA74E - matches theme
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                      ...UI_CONFIG.SHADOWS.MD,
                    }}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={32}
                      color="#FFFFFF"
                    />
                  </AnimatedButton>

                  <View className="flex-1 mr-4">
                    {/* Seekable Progress Bar */}
                    <View
                      ref={progressBarRef}
                      className="h-3 bg-gray-200 rounded-full mb-2"
                      {...panResponder.panHandlers}
                    >
                      <View
                        className="h-full rounded-full relative"
                        style={{
                          width: `${(isSeeking ? seekProgress : audioProgress) * 100}%`,
                          backgroundColor: UI_CONFIG.COLORS.SECONDARY, // #FEA74E
                        }}
                      >
                        {/* Seek Thumb */}
                        <View
                          className="absolute right-0 top-1/2 rounded-full border-2 border-white"
                          style={{
                            transform: [{ translateX: 6 }, { translateY: -8 }],
                            width: 16,
                            height: 16,
                            backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                          }}
                        />
                      </View>
                    </View>

                    {/* Time Display */}
                    <View className="flex-row justify-between">
                      <Text className="text-xs font-rubik text-gray-500">
                        {formatTime(
                          isSeeking
                            ? seekProgress * (audioDuration || song.duration * 1000)
                            : audioPosition
                        )}
                      </Text>
                      <Text className="text-xs font-rubik text-gray-500">
                        {formatTime(audioDuration || song.duration * 1000)}
                      </Text>
                    </View>
                  </View>

                  {/* Mute Button */}
                  <AnimatedButton onPress={onToggleMute}>
                    <Ionicons
                      name={isMuted ? "volume-mute" : "volume-high"}
                      size={24}
                      color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                    />
                  </AnimatedButton>

                  {/* Playlist Button - Samsung-style list icon */}
                  <AnimatedButton
                    onPress={() => {
                      setShowPlaylistView(true);
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="list"
                      size={24}
                      color={UI_CONFIG.COLORS.SECONDARY}
                    />
                  </AnimatedButton>
                </View>
              </View>

              {/* Action Buttons - Matches app theme */}
              <View
                style={{
                  paddingHorizontal: UI_CONFIG.SPACING.MD,
                  gap: 12,
                  marginBottom: UI_CONFIG.SPACING.MD,
                }}
              >
                <AnimatedButton
                  onPress={handleAddToPlaylist}
                  style={{
                    backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                    paddingVertical: UI_CONFIG.SPACING.MD,
                    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    ...UI_CONFIG.SHADOWS.MD,
                  }}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Rubik-SemiBold",
                      marginLeft: 8,
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                    }}
                  >
                    Add to Playlist
                  </Text>
                </AnimatedButton>

                <AnimatedButton
                  onPress={onClose}
                  style={{
                    backgroundColor: UI_CONFIG.COLORS.SURFACE,
                    paddingVertical: 14,
                    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
                    borderWidth: 1,
                    borderColor: UI_CONFIG.COLORS.BORDER,
                  }}
                >
                  <Text
                    style={{
                      color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                      fontFamily: "Rubik-SemiBold",
                      textAlign: "center",
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                    }}
                  >
                    Close
                  </Text>
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
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-2xl w-full max-w-md max-h-[80%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200">
              <Text className="text-lg font-rubik-bold text-gray-900">
                Add to Playlist
              </Text>
              <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16 }}
            >
              {/* Create New Playlist Button - Matches app theme */}
              <AnimatedButton
                onPress={() => {
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
              {playlists.length === 0 ? (
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
          </View>
        </View>
      </Modal>

      {/* Create Playlist Modal */}
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
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white rounded-2xl w-full max-w-md p-6">
            <Text className="text-xl font-rubik-bold text-gray-900 mb-4">
              Create New Playlist
            </Text>

            <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
              Playlist Name *
            </Text>
            <TextInput
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Enter playlist name"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4 font-rubik"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-sm font-rubik-medium text-gray-700 mb-2">
              Description (Optional)
            </Text>
            <TextInput
              value={newPlaylistDescription}
              onChangeText={setNewPlaylistDescription}
              placeholder="Enter playlist description"
              className="border border-gray-300 rounded-lg px-4 py-3 mb-6 font-rubik"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            <View className="flex-row gap-3">
              <AnimatedButton
                onPress={() => {
                  setShowCreatePlaylist(false);
                  setNewPlaylistName("");
                  setNewPlaylistDescription("");
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  paddingVertical: 12,
                  borderRadius: 10,
                }}
              >
                <Text className="text-gray-700 font-rubik-bold text-center">
                  Cancel
                </Text>
              </AnimatedButton>
              <AnimatedButton
                onPress={handleCreatePlaylist}
                style={{
                  flex: 1,
                  backgroundColor: "#FEA74E",
                  paddingVertical: 12,
                  borderRadius: 10,
                }}
              >
                <Text className="text-white font-rubik-bold text-center">
                  Create
                </Text>
              </AnimatedButton>
            </View>
          </View>
        </View>
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
                    No Playlists Yet
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
                    Create a playlist to organize your favorite songs
                  </Text>
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
                          <Ionicons
                            name="musical-notes"
                            size={28}
                            color={UI_CONFIG.COLORS.SECONDARY}
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

