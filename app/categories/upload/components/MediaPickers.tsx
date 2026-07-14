/**
 * Media file + cover photo pickers with video preview
 */

import { Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image, Text, TouchableOpacity, View } from "react-native";
import {
  getMediaPickerSize,
  getResponsiveFontSize,
  getResponsiveSize,
  getResponsiveSpacing,
  getThumbnailSize,
  isSmallScreen,
} from "../../../../utils/responsive";
import type { MediaFile } from "../types";

type MediaPickersProps = {
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  orientation: "portrait" | "landscape";
  onPickMedia: () => void;
  onPickThumbnail: () => void;
};

export function MediaPickers({
  file,
  thumbnail,
  orientation,
  onPickMedia,
  onPickThumbnail,
}: MediaPickersProps) {
  const previewVideoPlayer = useVideoPlayer(
    file && file.mimeType?.startsWith("video") ? file.uri : "",
    (player) => {
      player.loop = false;
      player.muted = false;
    }
  );

  const mediaSize = getMediaPickerSize();
  const thumbnailSize = getThumbnailSize();
  const containerPadding = getResponsiveSpacing(16, 20, 24, 32);

  const mediaContent = (
    <TouchableOpacity
      onPress={onPickMedia}
      className={`bg-gray-200 rounded-xl items-center justify-center ${
        isSmallScreen || orientation === "landscape" ? "mb-4" : "mr-3"
      }`}
      style={{
        width: mediaSize.width,
        height: mediaSize.height,
      }}
      activeOpacity={0.8}
    >
      {!file ? (
        <View className="items-center">
          <Feather
            name="plus"
            size={getResponsiveSize(30, 35, 40)}
            color="gray"
          />
          <Text
            className="text-gray-600 text-center mt-2"
            style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
          >
            Select Media
          </Text>
        </View>
      ) : file.mimeType.startsWith("video") && previewVideoPlayer ? (
        <VideoView
          player={previewVideoPlayer}
          contentFit="cover"
          nativeControls={true}
          allowsFullscreen={false}
          style={{ width: "100%", height: "100%", borderRadius: 12 }}
        />
      ) : (
        <Text
          className="px-4 text-gray-700 text-center"
          style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
        >
          {file.name}
        </Text>
      )}
    </TouchableOpacity>
  );

  const thumbnailContent = (
    <TouchableOpacity
      onPress={onPickThumbnail}
      className="bg-gray-100 rounded-lg items-center justify-center border-2 border-dashed border-gray-300"
      style={{
        width: thumbnailSize.width,
        height: thumbnailSize.height,
      }}
      activeOpacity={0.8}
    >
      {!thumbnail ? (
        <View className="items-center">
          <Feather
            name="image"
            size={getResponsiveSize(25, 30, 35)}
            color="gray"
          />
          <Text
            className="text-gray-600 text-center mt-2"
            style={{ fontSize: getResponsiveFontSize(10, 11, 12) }}
          >
            Select{"\n"}Cover Photo
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: thumbnail.uri || undefined }}
          style={{ width: "100%", height: "100%", borderRadius: 8 }}
          resizeMode="cover"
        />
      )}
    </TouchableOpacity>
  );

  if (isSmallScreen || orientation === "landscape") {
    return (
      <View
        className="items-center"
        style={{ paddingHorizontal: containerPadding }}
      >
        {mediaContent}
        {thumbnailContent}
      </View>
    );
  }

  return (
    <View
      className="flex-row justify-center items-start"
      style={{ paddingHorizontal: containerPadding }}
    >
      {mediaContent}
      {thumbnailContent}
    </View>
  );
}
