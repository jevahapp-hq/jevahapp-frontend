/**
 * VideoCardPlayerArea - Video/thumbnail, overlay, progress bar
 */
import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import React from "react";
import { Image, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { VideoCardSkeleton } from "../../../../shared/components";
import { ContentTypeBadge } from "../../../../shared/components/ContentTypeBadge";
import { MediaPlayButton } from "../../../../shared/components/MediaPlayButton";
import { ModerationBadge } from "../../../../shared/components/ModerationBadge";
import { VideoProgressBar } from "../../../../shared/components/VideoProgressBar";
import type { MediaItem } from "../../../../shared/types";
import { isValidUri } from "../../../../shared/utils";

export interface VideoCardPlayerAreaProps {
  video: MediaItem;
  contentKey: string;
  index: number;
  videoUrl: string | null;
  failedVideoLoad: boolean;
  isAudioSermon: boolean;
  player: any;
  thumbnailUri: string | undefined;
  videoLoaded: boolean;
  videoLoadedRef: React.MutableRefObject<boolean>;
  showOverlay: boolean;
  isPlaying: boolean;
  audioState?: { isPlaying: boolean; progress: number; isMuted: boolean; position: number; duration: number };
  videoProgress: number;
  videoPositionMs: number;
  lastKnownDurationRef: React.MutableRefObject<number>;
  backendDurationMs: number;
  isMuted: boolean;
  onVideoTap: (key: string, video: MediaItem, index: number) => void;
  handleVideoTap: () => void;
  handleHoverStart: () => void;
  handleHoverEnd: () => void;
  handleTogglePlay: (setIsPlayTogglePending: (v: boolean) => void) => void;
  setIsPlayTogglePending: (v: boolean) => void;
  isPlayTogglePending: boolean;
  handleToggleMute: () => void;
  seekToPercent: (percent: number) => Promise<void>;
}

export function VideoCardPlayerArea({
  video,
  contentKey,
  index,
  videoUrl,
  failedVideoLoad,
  isAudioSermon,
  player,
  thumbnailUri,
  videoLoaded,
  videoLoadedRef,
  showOverlay,
  isPlaying,
  audioState,
  videoProgress,
  videoPositionMs,
  lastKnownDurationRef,
  backendDurationMs,
  isMuted,
  onVideoTap,
  handleVideoTap,
  handleHoverStart,
  handleHoverEnd,
  handleTogglePlay,
  setIsPlayTogglePending,
  isPlayTogglePending,
  handleToggleMute,
  seekToPercent,
}: VideoCardPlayerAreaProps) {
  return (
    <TouchableWithoutFeedback
      onPress={handleVideoTap}
      onPressIn={handleHoverStart}
      onPressOut={handleHoverEnd}
    >
      <View className="w-full h-[400px] overflow-hidden relative">
        {!failedVideoLoad && videoUrl && !isAudioSermon && player ? (
          <VideoView
            key={videoUrl || contentKey}
            player={player}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
          />
        ) : (
          <Image
            source={
              thumbnailUri
                ? { uri: thumbnailUri }
                : { uri: "https://via.placeholder.com/400x400/cccccc/ffffff?text=Audio" }
            }
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode="cover"
          />
        )}

        {!videoLoadedRef.current &&
          !videoLoaded &&
          !failedVideoLoad &&
          isValidUri(video.fileUrl) &&
          !isAudioSermon && (
            <View className="absolute inset-0" pointerEvents="none">
              <VideoCardSkeleton dark={true} />
            </View>
          )}

        {video.moderationStatus && video.moderationStatus !== 'approved' && (
          <View style={{ position: 'absolute', top: 50, left: 12, zIndex: 11 }}>
            <ModerationBadge status={video.moderationStatus} />
          </View>
        )}

        <ContentTypeBadge
          contentType={video.contentType || "video"}
          position="top-left"
          size="medium"
        />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onVideoTap(contentKey, video, index)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: "rgba(0,0,0,0.6)",
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 6,
            flexDirection: "row",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <MediaPlayButton
          isPlaying={isAudioSermon ? (audioState?.isPlaying ?? false) : isPlaying}
          onPress={() => handleTogglePlay(setIsPlayTogglePending)}
          showOverlay={showOverlay}
          size="medium"
          disabled={isPlayTogglePending}
        />

        <View
          style={{
            position: "absolute",
            bottom: 52,
            left: 12,
            right: 12,
            paddingHorizontal: 10,
            paddingVertical: 6,
            pointerEvents: "none",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Rubik_600SemiBold",
              color: "#FFFFFF",
              lineHeight: 16,
              textShadowColor: "rgba(0, 0, 0, 0.75)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {video.title && video.title.length > 70
              ? `${video.title.substring(0, 70)}...`
              : video.title}
          </Text>
        </View>

        <VideoProgressBar
          progress={
            isAudioSermon
              ? (audioState?.progress ?? 0)
              : Math.max(0, Math.min(1, videoProgress || 0))
          }
          isMuted={isAudioSermon ? (audioState?.isMuted ?? false) : isMuted}
          onToggleMute={handleToggleMute}
          onSeekToPercent={seekToPercent}
          bottomOffset={24}
          currentMs={
            isAudioSermon
              ? Number.isFinite(audioState?.position) && (audioState?.position ?? 0) >= 0
                ? (audioState?.position ?? 0)
                : 0
              : videoPositionMs
          }
          durationMs={
            isAudioSermon
              ? Number.isFinite(audioState?.duration) && (audioState?.duration ?? 0) > 0
                ? (audioState?.duration ?? 0)
                : 0
              : Number.isFinite(lastKnownDurationRef.current) &&
                lastKnownDurationRef.current > 0
                ? lastKnownDurationRef.current
                : backendDurationMs > 0
                  ? backendDurationMs
                  : 0
          }
          showControls={true}
          showFloatingLabel={true}
          enlargeOnDrag={true}
          knobSize={8}
          knobSizeDragging={10}
          trackHeights={{ normal: 4, dragging: 8 }}
          seekSyncTicks={4}
          seekMsTolerance={200}
          minProgressEpsilon={0.005}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
