import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { CompactAudioControls } from "../../../shared/components/CompactAudioControls";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import { InteractionButtons } from "../../../shared/components/InteractionButtons";
import { UI_CONFIG } from "../../../shared/constants";
import { MusicCardProps } from "../../../shared/types";
import {
  getTimeAgo,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
  isValidUri,
} from "../../../shared/utils";

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
  const [showOverlay, setShowOverlay] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const modalKey = `music-${audio._id || index}`;
  const contentId = audio._id || `music-${index}`;
  const isSermon = audio.contentType === "sermon";

  // Debug logging
  console.log(`🎵 MusicCard rendering: ${audio.title}`, {
    contentId,
    fileUrl: audio.fileUrl,
    isValidUrl: isValidUri(audio.fileUrl),
    isPlaying,
    progress,
  });

  // Handle play button press
  const handlePlayPress = useCallback(() => {
    console.log(`🎵 Playing audio: ${audio.title}`, {
      uri: audio.fileUrl,
      id: contentId,
    });

    if (audio.fileUrl && isValidUri(audio.fileUrl)) {
      onPlay(audio.fileUrl, contentId);
    } else {
      console.warn("❌ Invalid audio URL:", audio.fileUrl);
    }
  }, [audio.fileUrl, audio.title, contentId, onPlay]);

  // Handle overlay toggle
  const handleOverlayToggle = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  // Get thumbnail source
  const thumbnailSource = audio?.imageUrl || audio?.thumbnailUrl;
  const thumbnailUri =
    typeof thumbnailSource === "string"
      ? thumbnailSource
      : (thumbnailSource as any)?.uri;

  return (
    <View className="flex flex-col mb-10">
      <TouchableWithoutFeedback onPress={handleOverlayToggle}>
        <View className="w-full h-[400px] overflow-hidden relative">
          {/* Background Image/Thumbnail */}
          <Image
            source={
              thumbnailUri
                ? { uri: thumbnailUri }
                : {
                    uri: "https://via.placeholder.com/400x400/cccccc/ffffff?text=Music",
                  }
            }
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
            }}
            resizeMode="cover"
          />

          {/* Content Type Icon - Top Left */}
          <View className="absolute top-4 left-4">
            <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons
                name={isSermon ? "person" : "musical-notes"}
                size={16}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Center Play/Pause Button */}
          <View className="absolute inset-0 justify-center items-center">
            <TouchableOpacity
              onPress={handlePlayPress}
              className="bg-white/70 p-4 rounded-full"
              activeOpacity={0.9}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={40}
                color={UI_CONFIG.COLORS.SECONDARY}
              />
            </TouchableOpacity>
          </View>

          {/* Compact Audio Controls - Bottom */}
          <View className="absolute bottom-3 left-3 right-3">
            <CompactAudioControls
              audioUrl={audio.fileUrl || ""}
              audioKey={audio._id || audio.fileUrl || "unknown"}
              className="bg-black/50 rounded-lg"
              onPlay={handlePlayPress}
              onPause={() => {}}
            />
          </View>

          {/* Title Overlay */}
          <View className="absolute bottom-12 left-3 right-3 px-4 py-2 rounded-md">
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

          {/* Tap to show/hide overlay */}
          <TouchableWithoutFeedback onPress={handleOverlayToggle}>
            <View className="absolute inset-0" />
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Footer with User Info and Interactions */}
      <View className="flex-row items-center justify-between mt-2 px-3">
        <View className="flex flex-row items-center flex-1">
          {/* User Avatar */}
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1">
            <Image
              source={getUserAvatarFromContent(audio)}
              style={{ width: 30, height: 30, borderRadius: 999 }}
              resizeMode="cover"
            />
          </View>

          {/* User Info */}
          <View className="ml-3 flex-1">
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

            {/* Interaction Buttons */}
            <View className="mt-2">
              <InteractionButtons
                item={audio}
                contentId={contentId}
                onLike={() => onLike(audio)}
                onComment={() => onComment(audio)}
                onSave={() => onSave(audio)}
                onShare={() => onShare(audio)}
                onDownload={() => onDownload(audio)}
                userLikeState={false} // These should come from props or context
                userSaveState={false}
                likeCount={audio.likes || 0}
                saveCount={audio.saves || 0}
                commentCount={audio.comments || 0}
                viewCount={audio.views || 0}
                isDownloaded={false} // This should come from download store
                layout="horizontal"
              />
            </View>
          </View>
        </View>

        {/* More Options */}
        <TouchableOpacity
          className="ml-2"
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Slide-up Content Action Modal */}
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

      {/* Debug Info (Development Only) */}
      {__DEV__ && (
        <View className="mx-3 mt-2 p-2 bg-green-100 rounded">
          <Text className="text-xs text-green-800">
            Debug: {audio.title} | Playing: {isPlaying ? "Yes" : "No"} |
            Progress: {Math.round(progress * 100)}% | Type: {audio.contentType}
          </Text>
        </View>
      )}
    </View>
  );
};

export default MusicCard;
