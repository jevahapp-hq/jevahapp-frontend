import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Image,
  PanResponder,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import { useAdvancedAudioPlayer } from "../../../../app/hooks/useAdvancedAudioPlayer";
import {
  useContentCount,
  useUserInteraction,
} from "../../../../app/store/useInteractionStore";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import { CommentIcon } from "../../../shared/components/CommentIcon";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import LikeBurst from "../../../shared/components/LikeBurst";
import { MusicCardProps } from "../../../shared/types";
import {
  getTimeAgo,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
  isValidUri,
} from "../../../shared/utils";

const ORANGE = "#FF8A00";

export const MusicCard: React.FC<MusicCardProps> = ({
  audio,
  index,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
  onPlay,
  isPlaying = false,
  progress = 0,
}) => {
  const AvatarWithInitialFallback = ({
    imageSource,
    name,
  }: {
    imageSource: any;
    name: string;
  }) => {
    const [errored, setErrored] = useState(false);
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    return !errored ? (
      <Image
        source={imageSource}
        style={{ width: 30, height: 30, borderRadius: 999 }}
        resizeMode="cover"
        onError={() => setErrored(true)}
      />
    ) : (
      <Text className="text-[14px] font-semibold text-[#344054]">
        {initial}
      </Text>
    );
  };
  const [showOverlay, setShowOverlay] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const { showCommentModal } = useCommentModal();

  const modalKey = `music-${audio._id || index}`;
  const contentId = audio._id || `music-${index}`;
  const audioKey = `music-${audio._id || index}`;
  const isSermon = audio.contentType === "sermon";

  const audioUrl = typeof audio.fileUrl === "string" ? audio.fileUrl : "";
  const [playerState, controls] = useAdvancedAudioPlayer(
    isValidUri(audioUrl) ? audioUrl : null,
    {
      audioKey,
      autoPlay: false,
      loop: false,
    }
  );

  const handlePlayPress = useCallback(() => {
    if (!audioUrl || !isValidUri(audioUrl)) return;
    controls.togglePlay();
  }, [audioUrl, controls]);

  const handleOverlayToggle = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  const seekBySeconds = useCallback(
    async (deltaSec: number) => {
      const dur = playerState.duration || 0;
      if (dur === 0) return;
      const nextMs = Math.max(
        0,
        Math.min((playerState.position || 0) + deltaSec * 1000, dur)
      );
      await controls.seekTo(nextMs / dur);
    },
    [playerState.duration, playerState.position, controls]
  );

  const thumbnailSource = audio?.imageUrl || audio?.thumbnailUrl;
  const thumbnailUri =
    typeof thumbnailSource === "string"
      ? thumbnailSource
      : (thumbnailSource as any)?.uri;

  const formattedProgress = Math.round((playerState.progress || 0) * 100);

  // View tracking state
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const storeRef = useRef<any>(null);
  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../app/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch {}
  }, []);

  // Derive current view and comment counts from store if available
  const contentIdForViews = String(audio._id || "");
  const viewsFromStore = contentIdForViews
    ? useContentCount(contentIdForViews, "views")
    : 0;
  const savesFromStore = contentIdForViews
    ? useContentCount(contentIdForViews, "saves")
    : 0;
  const savedFromStore = contentIdForViews
    ? useUserInteraction(contentIdForViews, "saved")
    : false;
  const commentsFromStore = contentIdForViews
    ? useContentCount(contentIdForViews, "comments")
    : 0;

  // Record a qualified view when playback crosses 3s or 25%, or on completion
  useEffect(() => {
    const contentId = String(audio._id || "");
    if (!contentId || hasTrackedView) return;
    const isPlaying = playerState.isPlaying;
    const positionMs = playerState.position || 0;
    const progress = playerState.progress || 0;
    const durationMs = playerState.duration || 0;

    const qualifies = isPlaying && (positionMs >= 3000 || progress >= 0.25);
    const finished = durationMs > 0 && progress >= 0.999;

    if (qualifies || finished) {
      (async () => {
        try {
          const result = await contentInteractionAPI.recordView(
            contentId,
            "media",
            {
              durationMs: finished ? durationMs : positionMs,
              progressPct: Math.round((progress || 0) * 100),
              isComplete: finished,
            }
          );
          setHasTrackedView(true);
          if (result?.totalViews != null && storeRef.current?.mutateStats) {
            storeRef.current.mutateStats(contentId, () => ({
              views: Number(result.totalViews) || 0,
            }));
          }
        } catch {}
      })();
    }
  }, [
    audio._id,
    playerState.isPlaying,
    playerState.position,
    playerState.progress,
    playerState.duration,
    hasTrackedView,
  ]);

  // Draggable seek bar
  const trackWidthRef = useRef(1);
  const handleX = useRef(new Animated.Value(0)).current;
  const currentX = useMemo(
    () => (playerState.progress || 0) * (trackWidthRef.current || 1),
    [playerState.progress]
  );

  // Sync handle position on progress update
  React.useEffect(() => {
    Animated.timing(handleX, {
      toValue: currentX,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [currentX, handleX]);

  const onSeekToX = useCallback(
    async (x: number) => {
      const width = trackWidthRef.current || 1;
      const clamped = Math.max(0, Math.min(x, width));
      const nextProgress = clamped / width;
      await controls.seekTo(nextProgress);
    },
    [controls]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        onSeekToX(gestureState.x0 - 16);
      },
      onPanResponderMove: (evt, gestureState) => {
        onSeekToX(gestureState.moveX - 16);
      },
    })
  ).current;

  return (
    <View className="flex flex-col mb-10">
      <TouchableWithoutFeedback onPress={handleOverlayToggle}>
        <View className="w-full h-[400px] overflow-hidden relative">
          <Image
            source={
              thumbnailUri
                ? { uri: thumbnailUri }
                : {
                    uri: "https://via.placeholder.com/400x400/cccccc/ffffff?text=Music",
                  }
            }
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode="cover"
          />

          <View className="absolute top-4 left-4" pointerEvents="box-none">
            <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons
                name={isSermon ? "person" : "musical-notes"}
                size={16}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Bottom Controls Styled */}
          <View
            className="absolute bottom-4 left-3 right-3"
            pointerEvents="box-none"
          >
            {/* Controls row with play button and progress bar */}
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handlePlayPress}
                className="mr-3"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={playerState.isPlaying ? "pause" : "play"}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              {/* Orange seek bar with handle */}
              <View
                className="flex-1 h-1.5 rounded-full mr-3"
                style={{ backgroundColor: ORANGE }}
                onLayout={(e) => {
                  trackWidthRef.current = e.nativeEvent.layout.width;
                }}
                {...panResponder.panHandlers}
              >
                <Animated.View
                  style={{
                    transform: [{ translateX: handleX }],
                    position: "absolute",
                    top: -4.5,
                  }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: ORANGE,
                    }}
                  />
                </Animated.View>
              </View>

              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => controls.toggleMute()}
                  className="mr-3"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={
                      playerState.isMuted
                        ? ("volume-mute" as any)
                        : ("volume-high-outline" as any)
                    }
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Title Overlay */}
          <View
            className="absolute bottom-12 left-3 right-3 px-4 py-2 rounded-md"
            pointerEvents="box-none"
          >
            <Text
              className="text-white font-semibold text-sm"
              numberOfLines={2}
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.8)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {audio.title}
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Footer with User Info and compact left-aligned stats/actions */}
      <View className="flex-row items-center justify-between mt-2 px-3">
        <View className="flex flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1">
            {/* Avatar with initial fallback */}
            <AvatarWithInitialFallback
              imageSource={getUserAvatarFromContent(audio) as any}
              name={getUserDisplayNameFromContent(audio)}
            />
          </View>
          <View className="ml-3">
            <View className="flex-row items-center">
              <Text className="text-sm font-semibold text-gray-800">
                {getUserDisplayNameFromContent(audio)}
              </Text>
              <View className="flex flex-row mt-1 ml-2">
                <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 ml-1">
                  {getTimeAgo(audio.createdAt)}
                </Text>
              </View>
            </View>
            <View className="flex-row mt-2 items-center pl-2">
              <View className="flex-row items-center mr-6">
                <MaterialIcons name="visibility" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1">
                  {viewsFromStore || audio.views || 0}
                </Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center mr-6"
                onPress={() => {
                  setLikeBurstKey((k) => k + 1);
                  onLike(audio);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name={false ? "favorite" : "favorite-border"}
                  size={28}
                  color={false ? "#D22A2A" : "#98A2B3"}
                />
                <LikeBurst
                  triggerKey={likeBurstKey}
                  color="#D22A2A"
                  size={14}
                  style={{ marginLeft: -6, marginTop: -8 }}
                />
                <Text className="text-[10px] text-gray-500 ml-1">
                  {audio.likes || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center mr-6"
                onPress={() => {
                  try {
                    console.log("🗨️ Comment icon pressed (music)", {
                      contentId: contentIdForViews,
                      title: audio.title,
                    });
                    showCommentModal([], String(contentId));
                  } catch {}
                  onComment && onComment(audio);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CommentIcon
                  comments={[]}
                  size={26}
                  color="#98A2B3"
                  showCount={true}
                  count={commentsFromStore || audio.comments || 0}
                  layout="horizontal"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const wasSaved = Boolean(savedFromStore);
                  onSave(audio);
                  const message = wasSaved
                    ? "Removed from library"
                    : "Saved to library";
                  try {
                    Alert.alert("Library", message);
                  } catch {}
                }}
                className="flex-row items-center mr-6"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={
                    savedFromStore
                      ? ("bookmark" as any)
                      : ("bookmark-outline" as any)
                  }
                  size={26}
                  color={savedFromStore ? "#FEA74E" : "#98A2B3"}
                />
                <Text className="text-[10px] text-gray-500 ml-1">
                  {savesFromStore || audio.saves || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onShare(audio)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="send" size={26} color="#98A2B3" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <TouchableOpacity
          className="ml-2"
          onPress={() => setModalVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <ContentActionModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onViewDetails={() => {}}
        onSaveToLibrary={() => onSave(audio)}
        onShare={() => onShare(audio)}
        onDownload={() => onDownload(audio)}
        isSaved={!!audio.saves}
        isDownloaded={false}
        contentTitle={audio.title}
      />
    </View>
  );
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor((ms || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default MusicCard;
