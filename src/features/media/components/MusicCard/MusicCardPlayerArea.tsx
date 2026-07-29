/**
 * Music media surface — cover art, overlays, transport controls.
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeImage } from "../../../../../app/components/SafeImage";
import AudioControlsOverlay from "../../../../shared/components/AudioControlsOverlay";
import { AudioCardSkeleton } from "../../../../shared/components/Skeleton";
import type { MediaItem } from "../../../../shared/types";

export function MusicCardPlayerArea(props: {
  audio: MediaItem;
  thumbnailUri?: string;
  isSermon: boolean;
  attemptedPlay: boolean;
  hasDuration: boolean;
  progress: number;
  isMuted: boolean;
  isPlaying: boolean;
  onToggleOverlay: () => void;
  onToggleMute: () => void;
  onSeekRelative: (deltaSec: number) => void;
  onSeekToPercent: (pct: number) => void;
  onPlayPress: () => void;
}) {
  const {
    audio,
    thumbnailUri,
    isSermon,
    attemptedPlay,
    hasDuration,
    progress,
    isMuted,
    isPlaying,
    onToggleOverlay,
    onToggleMute,
    onSeekRelative,
    onSeekToPercent,
    onPlayPress,
  } = props;

  return (
    <TouchableWithoutFeedback onPress={onToggleOverlay}>
      <View className="w-full h-[400px] overflow-hidden relative">
        <SafeImage
          uri={
            thumbnailUri ||
            "https://via.placeholder.com/400x400/cccccc/ffffff?text=Music"
          }
          style={{ width: "100%", height: "100%", position: "absolute" }}
          size="large"
        />

        {attemptedPlay && !hasDuration && (
          <View className="absolute inset-0" pointerEvents="none">
            <AudioCardSkeleton dark={true} />
          </View>
        )}

        <View className="absolute top-4 left-4" pointerEvents="box-none">
          <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
            <Ionicons
              name={isSermon ? "person" : "musical-notes"}
              size={16}
              color="#FFFFFF"
            />
          </View>
        </View>

        <View
          className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md"
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

        <AudioControlsOverlay
          progress={progress}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onSeekRelative={onSeekRelative}
          onSeekToPercent={onSeekToPercent}
        />

        <View className="absolute bottom-4 left-3" pointerEvents="box-none">
          <TouchableOpacity
            onPress={onPlayPress}
            className="mr-3"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: 12 }}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
