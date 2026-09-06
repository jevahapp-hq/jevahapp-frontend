import { Audio } from "expo-av";
import type { StoreApi } from "zustand";

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: any; // Can be require() or URL string
  thumbnailUrl: any;
  duration: number;
  category?: string;
  description?: string;
  /** Where this track was started from — feed scroll only pauses `feed` audio. */
  source?: "feed" | "copyright-free" | "library" | "hymn" | "ebook";
  /** Nested release context for “Playing from …” */
  release?: {
    id: string;
    title: string;
    coverUrl?: string;
    type?: string;
    slug?: string;
  };
  releaseTitle?: string;
}

export interface GlobalAudioPlayerState {
  // Current track
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;
  /** User-facing reason the last load failed (404 / missing file). */
  loadError: string | null;
  /**
   * True only while a playback session started in THIS app run is alive.
   *
   * `currentTrack` is persisted, so it survives a restart as a *resume point* —
   * but `soundInstance` is not, which means a rehydrated track has no engine
   * behind it and its transport controls would do nothing. Never persist this
   * flag: it is what lets the Now Playing surface distinguish "we are playing
   * something" from "we remember what was played last".
   */
  isSessionActive: boolean;

  // Playback state
  position: number; // in milliseconds
  duration: number; // in milliseconds
  progress: number; // 0-1

  // Audio instance
  soundInstance: Audio.Sound | null;

  // Queue (for future playlist support)
  queue: AudioTrack[];
  currentIndex: number;
  originalQueue: AudioTrack[]; // Original unshuffled queue
  repeatMode: "none" | "all" | "one"; // Repeat mode: none, all, or one
  isShuffled: boolean; // Whether queue is shuffled

  // Actions
  setTrack: (track: AudioTrack, shouldPlayImmediately?: boolean) => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seek: (position: number) => Promise<void>; // position in milliseconds
  seekToProgress: (progress: number) => Promise<void>; // progress 0-1
  setMuted: (muted: boolean) => Promise<void>;
  toggleMute: () => Promise<void>;
  setRate: (rate: number) => Promise<void>;
  stop: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  playAtIndex: (index: number) => Promise<void>;
  clear: () => Promise<void>;
  setRepeatMode: (mode: "none" | "all" | "one") => void;
  toggleShuffle: () => void;

  // Internal state setters
  setPlaying: (playing: boolean) => void;
  setLoading: (loading: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setProgressValue: (progress: number) => void;

  // Internal (non-persisted) guards for professional update management
  __isAdvancing?: boolean;
  __completionTimeout?: boolean;
  __completionTimeoutId?: any;
  __lastStatusUpdateTs?: number;
  /** Invalidates callbacks emitted by a previously unloaded Audio.Sound. */
  __loadGeneration?: number;
  /** Ignore player position callbacks until this timestamp (after a seek). */
  __ignoreStatusUntil?: number;
  /** Track ids that 404'd this session — skip them instead of looping. */
  __failedTrackIds?: Record<string, true>;
}

export type AudioPlayerGet = () => GlobalAudioPlayerState;
export type AudioPlayerSet = StoreApi<GlobalAudioPlayerState>["setState"];
