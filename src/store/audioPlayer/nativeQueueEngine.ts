import {
  createAudioPlaylist,
  type AudioPlaylist,
  type AudioPlaylistStatus,
} from "expo-audio";
import {
  releaseAudioPlayer,
  setAudioEngineReleaseHook,
} from "../../shared/audio/releaseAudioPlayer";
import {
  getAudioPlaybackClock,
  getLastAudioProgressCommitTs,
  resetAudioPlaybackClock,
  writeAudioPlaybackClock,
} from "./audioProgressStore";
import { normalizeAudioSource } from "./normalizeAudioSource";
import { playlistLoopForRepeat, queueIdentity } from "./nativeQueuePlan";
import { decidePlaybackTick } from "./playbackStatusTick";
import {
  resolveAudioDurationMs,
  trackDurationToMs,
} from "./resolveAudioDurationMs";
import { cancelScheduledTrackAdvance } from "./scheduleTrackAdvance";
import { detachStatusSubscription } from "./statusSubscription";
import type { AudioPlayerGet, AudioPlayerSet, AudioTrack } from "./types";

/**
 * One native playlist for the whole session.
 * ExoPlayer / AVQueuePlayer start the next item when the current one ends,
 * including while JS timers are frozen in the background.
 */
let playlist: AudioPlaylist | null = null;
let signature = "";
const session = { generation: 0, holdIndex: -1 };

export function nativeQueueCanSkip(tracks: { id?: string | null }[]): boolean {
  return !!playlist && queueIdentity(tracks) === signature;
}

export function skipLoadedQueue(index: number): void {
  if (!playlist) return;
  session.holdIndex = index;
  if (playlist.currentIndex !== index) {
    playlist.skipTo(index);
  }
  if (playlist.currentIndex === index) {
    session.holdIndex = -1;
  }
  playlist.play();
}

export function applyNativeLoop(
  mode: "none" | "all" | "one" | undefined
): void {
  if (!playlist) return;
  playlist.loop = playlistLoopForRepeat(mode);
}

export function releaseNativePlaylist(): void {
  const current = playlist;
  playlist = null;
  signature = "";
  session.generation = -1;
  session.holdIndex = -1;
  if (!current) return;
  releaseAudioPlayer(current);
}

setAudioEngineReleaseHook((player) => {
  if (!player || player !== playlist) return;
  playlist = null;
  signature = "";
  session.generation = -1;
  session.holdIndex = -1;
});

export function syncNativePlaylist(options: {
  get: AudioPlayerGet;
  set: AudioPlayerSet;
  tracks: AudioTrack[];
  index: number;
  play: boolean;
  generation: number;
  muted: boolean;
  repeatMode: "none" | "all" | "one" | undefined;
}): AudioPlaylist {
  const nextSignature = queueIdentity(options.tracks);
  if (!nextSignature) {
    throw new Error("Missing audio source for track");
  }

  const startIndex = clampIndex(options.index, options.tracks.length);
  const reuse =
    playlist != null && signature === nextSignature && playlist === options.get().soundInstance;

  if (!reuse) {
    const previous = playlist;
    playlist = null;
    signature = "";
    detachStatusSubscription(options.get, options.set);
    if (previous) releaseAudioPlayer(previous);
  }

  // Set before listeners attach so the first item cannot overwrite the song
  // the user actually pressed.
  session.generation = options.generation;
  session.holdIndex = startIndex;

  if (!playlist) {
    const created = createAudioPlaylist({
      sources: options.tracks.map((track) => normalizeAudioSource(track.audioUrl)),
      updateInterval: 250,
      loop: playlistLoopForRepeat(options.repeatMode),
    });
    playlist = created;
    signature = nextSignature;
    attachListeners(created, options.get, options.set);
  }

  const engine = playlist;
  if (!engine) {
    throw new Error("Missing audio source for track");
  }
  engine.loop = playlistLoopForRepeat(options.repeatMode);
  engine.muted = options.muted;

  if (engine.currentIndex !== startIndex) {
    engine.skipTo(startIndex);
  }
  if (engine.currentIndex === startIndex) {
    session.holdIndex = -1;
  }
  if (options.play) {
    engine.play();
  }
  return engine;
}

/**
 * Queue order changed (shuffle) while a playlist is already loaded.
 * Rebuild it and keep the current item's position.
 */
export function realignNativePlaylist(
  get: AudioPlayerGet,
  set: AudioPlayerSet
): void {
  if (!playlist) return;
  const state = get();
  if (!state.queue.length) return;
  if (queueIdentity(state.queue) === signature) {
    applyNativeLoop(state.repeatMode);
    return;
  }

  const positionSec = playlist.currentTime || 0;
  const wasPlaying = !!playlist.playing;
  const engine = syncNativePlaylist({
    get,
    set,
    tracks: state.queue,
    index: state.currentIndex,
    play: false,
    generation: state.__loadGeneration || 0,
    muted: state.isMuted,
    repeatMode: state.repeatMode,
  });
  if (positionSec > 0.2) {
    void engine.seekTo(positionSec);
  }
  if (wasPlaying) engine.play();
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(index, length - 1);
}

function attachListeners(
  engine: AudioPlaylist,
  get: AudioPlayerGet,
  set: AudioPlayerSet
): void {
  const onStatus = (status: AudioPlaylistStatus) => {
    handlePlaylistStatus(engine, status, get, set);
  };
  const onTrack = (data: { previousIndex: number; currentIndex: number }) => {
    if (get().__loadGeneration !== session.generation) return;
    adoptTrack(engine, data.currentIndex, undefined, get, set);
  };
  const statusSub = engine.addListener("playlistStatusUpdate", onStatus);
  const trackSub = engine.addListener("trackChanged", onTrack);
  set({
    __statusSubscription: {
      remove() {
        try {
          statusSub.remove();
        } catch {
          // already removed
        }
        try {
          trackSub.remove();
        } catch {
          // already removed
        }
      },
    },
  });
}

function adoptTrack(
  engine: AudioPlaylist,
  index: number,
  status: AudioPlaylistStatus | undefined,
  get: AudioPlayerGet,
  set: AudioPlayerSet
): void {
  const track = get().queue[index];
  if (session.holdIndex >= 0 && index !== session.holdIndex) return;
  if (!track) return;
  session.holdIndex = -1;
  const prev = get();
  if (prev.currentIndex === index && prev.currentTrack?.id === track.id) return;

  const position = Math.max(0, (status?.currentTime || engine.currentTime || 0) * 1000);
  const duration = resolveAudioDurationMs({
    playerDurationMs: (status?.duration || engine.duration || 0) * 1000,
    knownMs: trackDurationToMs(track.duration),
    trackDurationSec: track.duration,
  });
  const progress = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;
  writeAudioPlaybackClock({
    trackId: track.id,
    position,
    progress,
    duration,
  });
  set({
    currentIndex: index,
    currentTrack: track,
    isPlaying: status?.playing ?? engine.playing,
    isSessionActive: true,
    isLoading: false,
    loadError: null,
    position,
    progress,
    duration,
  });
}

function handlePlaylistStatus(
  engine: AudioPlaylist,
  status: AudioPlaylistStatus,
  get: AudioPlayerGet,
  set: AudioPlayerSet
): void {
  if (get().__loadGeneration !== session.generation) return;
  if (session.holdIndex >= 0 && status.currentIndex !== session.holdIndex) return;
  session.holdIndex = -1;
  if (!status.isLoaded && !status.didJustFinish) return;

  const prev = get();
  const reportedIndex = status.currentIndex;
  if (
    reportedIndex !== prev.currentIndex &&
    prev.queue[reportedIndex]
  ) {
    adoptTrack(engine, reportedIndex, status, get, set);
  }

  if (
    !status.didJustFinish &&
    (prev.__ignoreStatusUntil || 0) > Date.now()
  ) {
    return;
  }

  const live = get();
  const track = live.queue[status.currentIndex] || live.currentTrack;
  if (!track) return;

  const playerDurationMs = (status.duration || 0) * 1000;
  const newDuration = resolveAudioDurationMs({
    playerDurationMs,
    knownMs: live.duration,
    trackDurationSec: track.duration,
  });

  if (status.didJustFinish) {
    cancelScheduledTrackAdvance();
    const finishedPosition = newDuration || live.duration;
    writeAudioPlaybackClock({
      trackId: track.id,
      position: finishedPosition,
      progress: finishedPosition > 0 ? 1 : 0,
      duration: finishedPosition || live.duration,
    });
    set({
      isPlaying: false,
      progress: finishedPosition > 0 ? 1 : 0,
      position: finishedPosition,
      duration: finishedPosition || live.duration,
    });
    return;
  }

  const newPosition = (status.currentTime || 0) * 1000;
  const newProgress =
    newDuration > 0 ? Math.max(0, Math.min(1, newPosition / newDuration)) : 0;
  const clock = getAudioPlaybackClock();
  const now = Date.now();
  const tick = decidePlaybackTick({
    now,
    lastCommitTs: getLastAudioProgressCommitTs(),
    prevPosition: clock.position,
    nextPosition: newPosition,
    prevProgress: clock.progress,
    nextProgress: newProgress,
    prevPlaying: live.isPlaying,
    nextPlaying: status.playing,
    prevDuration: clock.duration || live.duration,
    nextDuration: newDuration,
  });

  if (!tick.commitPosition && !tick.playingChanged && !tick.durationChanged) {
    return;
  }

  if (tick.commitPosition) {
    writeAudioPlaybackClock(
      {
        trackId: track.id,
        position: newPosition,
        progress: newProgress,
        duration: newDuration || clock.duration,
      },
      now
    );
  }

  const sessionUpdates: Record<string, unknown> = {};
  if (tick.playingChanged) sessionUpdates.isPlaying = status.playing;
  if (tick.durationChanged) {
    sessionUpdates.duration = newDuration;
    if (!tick.commitPosition) {
      writeAudioPlaybackClock({ trackId: track.id, duration: newDuration });
    }
  }
  if (Object.keys(sessionUpdates).length > 0) {
    sessionUpdates.__lastStatusUpdateTs = now;
    set(sessionUpdates as any);
  }
}
