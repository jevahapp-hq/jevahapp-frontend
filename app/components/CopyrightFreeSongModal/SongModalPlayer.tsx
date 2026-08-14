import React from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { UI_CONFIG } from "../../../src/shared/constants";
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
  albumArtSize: number;
  imageSource: { uri: string } | null;
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
    <PlayerHeader onClose={onClose} onOptionsPress={onOptionsPress} />
  );

  const body = (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <PlayerBackground imageSource={imageSource} />
      {header}

      <View
        style={{
          flex: 1,
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingTop: UI_CONFIG.SPACING.XL,
          paddingBottom: UI_CONFIG.SPACING.XL,
          justifyContent: "space-between",
        }}
      >
        <PlayerArtwork imageSource={imageSource} albumArtSize={albumArtSize} />

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

  if (!dismissGesture) return body;

  return <GestureDetector gesture={dismissGesture}>{body}</GestureDetector>;
}
