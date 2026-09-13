import { useCallback, useMemo, useRef, useState } from "react";
import { Share, View } from "react-native";
import { cycleRepeatOne } from "@/store/audioPlayer/queueAdvance";
import { useGlobalAudioPlayerStore } from "@/store/useGlobalAudioPlayerStore";
import { useSeekPanResponder } from "@/components/CopyrightFreeSongModal/useCopyrightFreeSongModalLogic";
import { PlayerActionChips } from "@/components/CopyrightFreeSongModal/components/PlayerActionChips";
import { PlayerProgress } from "@/components/CopyrightFreeSongModal/components/PlayerProgress";
import { PlayerTransport } from "@/components/CopyrightFreeSongModal/components/PlayerTransport";
import { SongModalOptions } from "@/components/CopyrightFreeSongModal/SongModalOptions";
import { useSongInteractions } from "@/components/CopyrightFreeSongModal/useSongInteractions";
import type { Playlist, PlaylistSong } from "@/store/usePlaylistStore";

function formatClock(ms: number) {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export function songIdOf(song: { id?: string; _id?: string } | null | undefined) {
  return String(song?.id || song?._id || "");
}

export function usePlaylistNowPlaying(playlist: Playlist | null) {
  const currentTrack = useGlobalAudioPlayerStore((s) => s.currentTrack);
  const isPlaying = useGlobalAudioPlayerStore((s) => s.isPlaying);
  const repeatMode = useGlobalAudioPlayerStore((s) => s.repeatMode);
  const setRepeatMode = useGlobalAudioPlayerStore((s) => s.setRepeatMode);
  const [showOptions, setShowOptions] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const progressBarRef = useRef<View>(null);

  const songs = playlist?.songs || [];
  const activeSong = useMemo(() => {
    const currentId = songIdOf(currentTrack);
    const match = songs.find((s) => songIdOf(s) === currentId);
    return match || songs[0] || null;
  }, [songs, currentTrack]);

  const interactions = useSongInteractions(activeSong);

  const seekGesture = useSeekPanResponder({
    onSeek: (progress) => {
      void useGlobalAudioPlayerStore.getState().seekToProgress(progress);
    },
    progressBarRef,
    setIsSeeking,
    setSeekProgress,
  });

  const handleShare = useCallback(async () => {
    if (!activeSong) return;
    const title = activeSong.title || "Jevah";
    await Share.share({
      title,
      message: `Listen to ${title} on Jevah`,
      url: String(activeSong.audioUrl || ""),
    }).catch(() => {});
  }, [activeSong]);

  const handleRepeatCycle = useCallback(() => {
    const store = useGlobalAudioPlayerStore.getState();
    const nextMode = cycleRepeatOne(store.repeatMode);
    setRepeatMode(nextMode);
    if (nextMode !== "one") return;
    void (async () => {
      try {
        await store.soundInstance?.seekTo?.(0);
      } catch {
        // play() still tries
      }
      await useGlobalAudioPlayerStore.getState().play();
    })();
  }, [setRepeatMode]);

  const isCurrentActive =
    !!isPlaying && songIdOf(currentTrack) === songIdOf(activeSong);

  return {
    currentTrack,
    isPlaying,
    isCurrentActive,
    repeatMode,
    activeSong,
    showOptions,
    setShowOptions,
    isSeeking,
    seekProgress,
    progressBarRef,
    seekGesture,
    handleShare,
    handleRepeatCycle,
    ...interactions,
  };
}

export function PlaylistHeroActions({
  nowPlaying,
  onPlayAll,
}: {
  nowPlaying: ReturnType<typeof usePlaylistNowPlaying>;
  onPlayAll: () => void;
}) {
  const handlePlayAll = useCallback(() => {
    if (nowPlaying.isCurrentActive) {
      void useGlobalAudioPlayerStore.getState().pause();
      return;
    }
    onPlayAll();
  }, [nowPlaying.isCurrentActive, onPlayAll]);

  return (
    <PlayerActionChips
      isLiked={nowPlaying.isLiked}
      isTogglingLike={nowPlaying.isTogglingLike}
      isInLibrary={nowPlaying.isInLibrary}
      isTogglingSave={nowPlaying.isTogglingSave}
      onToggleLike={nowPlaying.handleToggleLike}
      onPlayAll={handlePlayAll}
      isPlayAllActive={nowPlaying.isCurrentActive}
      onToggleSave={nowPlaying.handleToggleSave}
      onShare={nowPlaying.handleShare}
    />
  );
}

export function PlaylistTransportDock({
  playlist,
  bottomInset,
  onPlayAll,
  onRemovePlayingSong,
  nowPlaying,
}: {
  playlist: Playlist;
  bottomInset: number;
  onPlayAll: () => void;
  onRemovePlayingSong: (track: PlaylistSong) => void;
  nowPlaying: ReturnType<typeof usePlaylistNowPlaying>;
}) {
  const {
    currentTrack,
    isCurrentActive,
    repeatMode,
    activeSong,
    showOptions,
    setShowOptions,
    isSeeking,
    seekProgress,
    progressBarRef,
    seekGesture,
    isInLibrary,
    isTogglingSave,
    handleToggleSave,
    handleRepeatCycle,
  } = nowPlaying;

  if (!playlist.songs.length) return null;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8 + bottomInset,
        backgroundColor: "#07110F",
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.08)",
      }}
    >
      <PlayerProgress
        song={activeSong || currentTrack}
        isSeeking={isSeeking}
        seekProgress={seekProgress}
        formatTime={formatClock}
        progressBarRef={progressBarRef}
        panHandlers={seekGesture.panHandlers}
        onBarLayout={seekGesture.onBarLayout}
      />
      <PlayerTransport
        isPlaying={isCurrentActive}
        repeatMode={repeatMode}
        onTogglePlay={() => {
          if (!currentTrack || songIdOf(currentTrack) !== songIdOf(activeSong)) {
            onPlayAll();
            return;
          }
          void useGlobalAudioPlayerStore.getState().togglePlayPause();
        }}
        onPrevious={() => {
          void useGlobalAudioPlayerStore.getState().previous();
        }}
        onNext={() => {
          void useGlobalAudioPlayerStore.getState().next({ fromUser: true });
        }}
        onRepeatCycle={handleRepeatCycle}
        onOptionsPress={() => setShowOptions(true)}
        optionsPosition="start"
      />
      <SongModalOptions
        visible={showOptions}
        song={activeSong}
        viewCount={0}
        isInLibrary={isInLibrary}
        isTogglingSave={isTogglingSave}
        optionsSongData={null}
        loadingOptionsSong={false}
        bottomInset={bottomInset}
        playlistActionsOnly
        onClose={() => setShowOptions(false)}
        onToggleSave={() => {
          setShowOptions(false);
          void handleToggleSave();
        }}
        onRemoveFromPlaylist={() => {
          if (activeSong) onRemovePlayingSong(activeSong);
        }}
      />
    </View>
  );
}
