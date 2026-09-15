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
import { FeedMediaTypeOverlay } from "../../../../shared/components/FeedMediaTypeOverlay";
import { AudioCardSkeleton } from "../../../../shared/components/Skeleton";
import { VideoProgressBar } from "../../../../shared/components/VideoProgressBar";
import {
  useAudioDurationForTrack,
  useAudioPositionForTrack,
  useAudioProgressForTrack,
} from "@/store/audioPlayer/audioProgressStore";
import { resolveAudioDurationMs } from "@/store/audioPlayer/resolveAudioDurationMs";
import type { MediaItem } from "../../../../shared/types";

function MusicCardSeekBar(props: {
  audioId: string;
  itemDuration: number | undefined;
  isMuted: boolean;
  onToggleMute: () => void;
  onSeekToPercent: (pct: number) => void;
}) {
  const progress = useAudioProgressForTrack(props.audioId);
  const positionMs = useAudioPositionForTrack(props.audioId);
  const clockDuration = useAudioDurationForTrack(props.audioId);
  const durationMs = resolveAudioDurationMs({
    playerDurationMs: clockDuration,
    trackDurationSec: props.itemDuration,
  });
  const currentMs =
    durationMs > 0 && positionMs <= 0 && progress > 0
      ? progress * durationMs
      : positionMs;

  return (
    <VideoProgressBar
      progress={
        durationMs > 0 ? Math.min(1, currentMs / durationMs) : progress
      }
      currentMs={currentMs}
      durationMs={durationMs}
      isMuted={props.isMuted}
      onToggleMute={props.onToggleMute}
      onSeekToPercent={props.onSeekToPercent}
      showControls
      bottomOffset={10}
      enlargeOnDrag
      knobSize={12}
      knobSizeDragging={18}
      trackHeights={{ normal: 4, dragging: 8 }}
      seekDuringDrag
      liveSeekThrottleMs={32}
      enableHaptics
      verticalScrub={{ enabled: false }}
      style={{ zIndex: 200, elevation: 200, left: 44 }}
    />
  );
}

export function MusicCardPlayerArea(props: {
  audio: MediaItem;
  thumbnailUri?: string;
  isSermon: boolean;
  attemptedPlay: boolean;
  hasDuration: boolean;
  audioId: string;
  isMuted: boolean;
  isPlaying: boolean;
  onToggleOverlay: () => void;
  onToggleMute: () => void;
  onSeekRelative: (deltaSec: number) => void;
  onSeekToPercent: (pct: number) => void;
  onPlayPress: () => void;
  onOpenPlayer?: () => void;
}) {
  const {
    audio,
    thumbnailUri,
    isSermon,
    attemptedPlay,
    hasDuration,
    audioId,
    isMuted,
    isPlaying,
    onToggleOverlay,
    onToggleMute,
    onSeekToPercent,
    onPlayPress,
    onOpenPlayer,
  } = props;

  return (
    <View className="w-full h-[400px] overflow-hidden relative">
      <TouchableWithoutFeedback onPress={onToggleOverlay}>
        <View className="absolute inset-0">
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

          <FeedMediaTypeOverlay
            item={audio}
            contentType={isSermon ? "sermon" : "audio"}
            showCenter={false}
          />

          <View
            className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md"
            pointerEvents="none"
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

      {isSermon && onOpenPlayer ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenPlayer}
          accessibilityRole="button"
          accessibilityLabel="Open audio player"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 6,
            flexDirection: "row",
            alignItems: "center",
            zIndex: 20,
          }}
        >
          <Ionicons name="headset-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      <MusicCardSeekBar
        audioId={audioId}
        itemDuration={Number(audio.duration) || undefined}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onSeekToPercent={onSeekToPercent}
      />

      <View className="absolute bottom-3 left-3 z-[210]" pointerEvents="box-none">
        <TouchableOpacity
          onPress={onPlayPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}
