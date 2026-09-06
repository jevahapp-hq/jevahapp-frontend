import React from "react";
import type { ImageSourcePropType } from "react-native";
import { View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";
import { PlayerArtwork } from "./components/PlayerArtwork";
import { PlayerBackground } from "./components/PlayerBackground";
import { PlayerHeader } from "./components/PlayerHeader";
import { PlayerInfo } from "./components/PlayerInfo";
import { PlayerProgress } from "./components/PlayerProgress";
import { PlayerSkipControls } from "./components/PlayerSkipControls";
import { PlayerTransport } from "./components/PlayerTransport";
import { usePlayerSeek } from "./hooks/usePlayerSeek";

export interface SongModalPlayerProps {
  song: any;
  bottomInset?: number;
  albumArtSize: number;
  imageSource: ImageSourcePropType | null;
  isLiked: boolean;
  likeCount: number;
  viewCount: number;
  isTogglingLike: boolean;
  isPlaying: boolean;
  isSeeking: boolean;
  seekProgress: number;
  audioProgress: number;
  audioDuration: number;
  audioPosition: number;
  repeatMode: "none" | "all" | "one";
  isShuffled: boolean;
  isMuted: boolean;
  progressBarRef: React.RefObject<View | null>;
  panHandlers: any;
  onBarLayout?: (e: { nativeEvent: { layout: { width: number } } }) => void;
  formatTime: (ms: number) => string;
  onClose: () => void;
  onOptionsPress: () => void;
  onToggleLike: () => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSkip: (seconds: number) => void;
  onRepeatCycle: () => void;
  onToggleShuffle: () => void;
  onOpenPlaylistView: () => void;
  onShare?: () => void;
}

export function SongModalPlayer({
  song,
  bottomInset = 0,
  albumArtSize,
  imageSource,
  isLiked,
  likeCount,
  viewCount,
  isTogglingLike,
  isPlaying,
  isSeeking,
  seekProgress,
  audioProgress,
  audioDuration,
  audioPosition,
  repeatMode,
  isShuffled,
  isMuted,
  progressBarRef,
  panHandlers,
  onBarLayout,
  formatTime,
  onClose,
  onOptionsPress,
  onToggleLike,
  onTogglePlay,
  onToggleMute,
  onSkip,
  onRepeatCycle,
  onToggleShuffle,
  onOpenPlaylistView,
  onShare,
}: SongModalPlayerProps) {
  const { durationMs, displayProgress, displayPositionMs } = usePlayerSeek({
    song,
    isSeeking,
    seekProgress,
    audioProgress,
    audioDuration,
    audioPosition,
  });

  return (
    <View style={{ flex: 1 }}>
      <PlayerBackground imageSource={imageSource} />

      <View style={{ flexGrow: 1, minHeight: 0, paddingTop: 8 }}>
        <PlayerHeader onClose={onClose} onOptionsPress={onOptionsPress} />
        <View
          collapsable={false}
          style={{
            flex: 1,
            justifyContent: "flex-end",
            alignItems: "center",
            minHeight: 0,
            paddingHorizontal: UI_CONFIG.SPACING.LG,
            paddingBottom: UI_CONFIG.SPACING.MD,
          }}
        >
          <PlayerArtwork
            imageSource={imageSource}
            albumArtSize={albumArtSize}
            isPlaying={isPlaying}
          />
        </View>
      </View>

      <View
        style={{
          flexShrink: 0,
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingTop: UI_CONFIG.SPACING.SM,
          paddingBottom: UI_CONFIG.SPACING.LG + bottomInset,
        }}
      >
        <PlayerInfo
          title={song.title}
          artist={song.artist}
          isLiked={isLiked}
          likeCount={likeCount}
          viewCount={viewCount}
          isTogglingLike={isTogglingLike}
          onToggleLike={onToggleLike}
        />

        <View style={{ marginBottom: UI_CONFIG.SPACING.MD }}>
          <PlayerProgress
            displayProgress={displayProgress}
            displayPositionMs={displayPositionMs}
            durationMs={durationMs}
            formatTime={formatTime}
            progressBarRef={progressBarRef}
            panHandlers={panHandlers}
            onBarLayout={onBarLayout}
          />
          <PlayerTransport
            isPlaying={isPlaying}
            isShuffled={isShuffled}
            repeatMode={repeatMode}
            onTogglePlay={onTogglePlay}
            onSkip={onSkip}
            onRepeatCycle={onRepeatCycle}
            onToggleShuffle={onToggleShuffle}
          />
        </View>

        <PlayerSkipControls
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onOpenPlaylistView={onOpenPlaylistView}
          onShare={onShare}
        />
      </View>
    </View>
  );
}
