import React, { useRef } from "react";
import type { ImageSourcePropType } from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";
import { PlayerArtwork } from "./components/PlayerArtwork";
import { PlayerBackground } from "./components/PlayerBackground";
import { PlayerHeader } from "./components/PlayerHeader";
import { PlayerInfo } from "./components/PlayerInfo";
import { PlayerProgress } from "./components/PlayerProgress";
import { PlayerQueueList } from "./components/PlayerQueueList";
import { PlayerTransport } from "./components/PlayerTransport";

export interface SongModalPlayerProps {
  song: any;
  queueSongs?: any[];
  bottomInset?: number;
  topInset?: number;
  albumArtSize: number;
  imageSource: ImageSourcePropType | null;
  isLiked: boolean;
  isTogglingLike: boolean;
  isPlaying: boolean;
  isSeeking: boolean;
  seekProgress: number;
  repeatMode: "none" | "all" | "one";
  progressBarRef: React.RefObject<View | null>;
  panHandlers: any;
  onBarLayout?: (e: { nativeEvent: { layout: { width: number } } }) => void;
  formatTime: (ms: number) => string;
  onClose: () => void;
  onOptionsPress: () => void;
  onToggleLike: () => void;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRepeatCycle: () => void;
  onOpenPlaylistView: () => void;
  onSelectQueueSong?: (song: any) => void;
  onShare?: () => void;
  isInLibrary?: boolean;
  isTogglingSave?: boolean;
  onToggleSave?: () => void;
}

export function SongModalPlayer({
  song,
  queueSongs = [],
  bottomInset = 0,
  topInset = 0,
  albumArtSize,
  imageSource,
  isLiked,
  isTogglingLike,
  isPlaying,
  isSeeking,
  seekProgress,
  repeatMode,
  progressBarRef,
  panHandlers,
  onBarLayout,
  formatTime,
  onClose,
  onOptionsPress,
  onToggleLike,
  onTogglePlay,
  onPrevious,
  onNext,
  onRepeatCycle,
  onOpenPlaylistView,
  onSelectQueueSong,
  onShare,
  isInLibrary,
  isTogglingSave,
  onToggleSave,
}: SongModalPlayerProps) {
  const scrollRef = useRef<ScrollView>(null);

  const handleSelect = (next: any) => {
    onSelectQueueSong?.(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#07110F" }}>
      <PlayerBackground
        style={{
          paddingTop: topInset + 12,
        }}
      >
        <PlayerHeader onClose={onClose} onOptionsPress={onOptionsPress} />

        <View
          style={{
            paddingHorizontal: UI_CONFIG.SPACING.LG,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <PlayerArtwork
              imageSource={imageSource}
              albumArtSize={albumArtSize}
              isPlaying={isPlaying}
            />
          </View>
          <PlayerInfo
            title={song.title}
            artist={song.artist}
            isLiked={isLiked}
            isTogglingLike={isTogglingLike}
            onToggleLike={onToggleLike}
            onOpenPlaylistView={onOpenPlaylistView}
            onToggleSave={onToggleSave}
            onShare={onShare}
            isInLibrary={isInLibrary}
            isTogglingSave={isTogglingSave}
          />
        </View>
      </PlayerBackground>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingBottom: 12,
          flexGrow: 1,
        }}
      >
        {onSelectQueueSong ? (
          <PlayerQueueList
            songs={queueSongs}
            currentSong={song}
            onSelectSong={handleSelect}
          />
        ) : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingTop: 4,
          paddingBottom: 8 + bottomInset,
          backgroundColor: "#07110F",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "rgba(255,255,255,0.08)",
        }}
      >
        <PlayerProgress
          song={song}
          isSeeking={isSeeking}
          seekProgress={seekProgress}
          formatTime={formatTime}
          progressBarRef={progressBarRef}
          panHandlers={panHandlers}
          onBarLayout={onBarLayout}
        />
        <PlayerTransport
          isPlaying={isPlaying}
          repeatMode={repeatMode}
          onTogglePlay={onTogglePlay}
          onPrevious={onPrevious}
          onNext={onNext}
          onRepeatCycle={onRepeatCycle}
          onOptionsPress={onOptionsPress}
        />
      </View>
    </View>
  );
}
