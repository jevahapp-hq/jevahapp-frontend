/**
 * SongModalPlayer - Main player UI: album art, song info, like/views, progress, controls
 */
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ImageBackground, Platform, View } from "react-native";
import { PlayerAlbumArt } from "./components/PlayerAlbumArt";
import { PlayerControls } from "./components/PlayerControls";
import { PlayerFooter } from "./components/PlayerFooter";
import { PlayerHeader } from "./components/PlayerHeader";
import { PlayerInfo } from "./components/PlayerInfo";
import { PlayerProgressBar } from "./components/PlayerProgressBar";

export interface SongModalPlayerProps {
  song: any;
  albumArtSize: number;
  imageSource: { uri: string } | null;
  isLiked: boolean;
  likeCount: number; // For future display if needed
  viewCount: number; // For future display if needed
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
  progressBarRef: React.RefObject<View>;
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
}

export function SongModalPlayer({
  song,
  albumArtSize,
  imageSource,
  isLiked,
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
}: SongModalPlayerProps) {
  const durationMs = audioDuration || (song?.duration ? song.duration * 1000 : 0);
  const displayProgress = isSeeking ? seekProgress : audioProgress;
  const displayPositionMs = isSeeking
    ? seekProgress * durationMs
    : audioPosition;

  return (
    <View style={{ flex: 1 }}>
      {imageSource && (
        <>
          <ImageBackground
            source={imageSource}
            style={{
              position: "absolute",
              top: -120,
              left: -120,
              right: -120,
              bottom: -120,
              width: "160%",
              height: "160%",
            }}
            resizeMode="cover"
            blurRadius={Platform.OS === "ios" ? 100 : 60}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
              }}
            />
          </ImageBackground>
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.98)"]}
            locations={[0, 0.4, 0.9]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </>
      )}

      {/* Modularized Components */}
      <PlayerHeader onClose={onClose} onOptionsPress={onOptionsPress} />

      <View
        style={{
          flex: 1,
          paddingHorizontal: 32,
          paddingBottom: 48,
          justifyContent: "space-around",
        }}
      >
        <PlayerAlbumArt imageSource={imageSource} albumArtSize={albumArtSize} />

        <PlayerInfo
          title={song.title}
          artist={song.artist}
          isLiked={isLiked}
          onToggleLike={onToggleLike}
          isTogglingLike={isTogglingLike}
        />

        <PlayerProgressBar
          displayProgress={displayProgress}
          displayPositionMs={displayPositionMs}
          durationMs={durationMs}
          formatTime={formatTime}
          progressBarRef={progressBarRef}
          panHandlers={panHandlers}
        />

        <PlayerControls
          isPlaying={isPlaying}
          isShuffled={isShuffled}
          repeatMode={repeatMode}
          onTogglePlay={onTogglePlay}
          onSkip={onSkip}
          onRepeatCycle={onRepeatCycle}
          onToggleShuffle={onToggleShuffle}
        />

        <PlayerFooter
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onOpenPlaylistView={onOpenPlaylistView}
        />
      </View>
    </View>
  );
}
