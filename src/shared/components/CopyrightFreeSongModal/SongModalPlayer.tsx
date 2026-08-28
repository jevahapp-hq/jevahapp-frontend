import React, { useMemo } from "react";
import type { ImageSourcePropType } from "react-native";
import { PanResponder, View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";
import { useCopyrightFreeOverlayStore } from "@/store/useCopyrightFreeOverlayStore";
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
  handleGesture?: any;
  artworkGesture?: any;
}

function minimizePlayer() {
  useCopyrightFreeOverlayStore.getState().minimize();
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

  const dismissPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) =>
          g.dy > 10 && g.dy > Math.abs(g.dx) * 1.2,
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 28 || g.vy > 0.6) {
            minimizePlayer();
            onClose();
          }
        },
      }),
    [onClose]
  );

  return (
    <View style={{ flex: 1 }}>
      <PlayerBackground imageSource={imageSource} />

      <View style={{ flexGrow: 1, minHeight: 0 }}>
        <View
          {...dismissPan.panHandlers}
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingTop: 10,
            paddingBottom: 4,
            minHeight: 44,
          }}
        >
          <View
            style={{
              width: 48,
              height: 5,
              borderRadius: 3,
              backgroundColor: "rgba(255, 255, 255, 0.45)",
            }}
          />
        </View>
        <PlayerHeader onClose={onClose} onOptionsPress={onOptionsPress} />
        <View
          {...dismissPan.panHandlers}
          style={{
            flex: 1,
            justifyContent: "center",
            minHeight: 0,
            overflow: "hidden",
            paddingHorizontal: UI_CONFIG.SPACING.LG,
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
          paddingBottom: UI_CONFIG.SPACING.MD + bottomInset,
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
