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
  /**
   * Bottom safe-area inset, applied to the inner content rather than to the
   * overlay wrapper. Keeps the opaque background edge-to-edge while the
   * controls stay clear of the system gesture area.
   */
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
  dismissGesture?: any;
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
  dismissGesture,
}: SongModalPlayerProps) {
  const { durationMs, displayProgress, displayPositionMs } = usePlayerSeek({
    song,
    isSeeking,
    seekProgress,
    audioProgress,
    audioDuration,
    audioPosition,
  });

  const header = (
    <PlayerHeader
      onClose={onClose}
      onOptionsPress={onOptionsPress}
      dismissGesture={dismissGesture}
    />
  );

  const body = (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <PlayerBackground imageSource={imageSource} />
      {header}

      <View
        style={{
          flex: 1,
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingTop: UI_CONFIG.SPACING.MD,
          paddingBottom: UI_CONFIG.SPACING.MD + bottomInset,
          justifyContent: "center",
        }}
      >
        <View style={{ flexGrow: 1, justifyContent: "center", minHeight: 0 }}>
          <PlayerArtwork
            imageSource={imageSource}
            albumArtSize={albumArtSize}
            isPlaying={isPlaying}
          />
        </View>

        <View style={{ flexShrink: 0 }}>
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
    </View>
  );

  return body;
}
