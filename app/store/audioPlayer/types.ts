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
  isVirtual?: boolean; // If true, this track is played by an external player (e.g., useAdvancedAudioPlayer), don't load audio here
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

export interface VirtualTrackControls {
  togglePlayPause: () => Promise<void>;
  pause: () => Promise<void>;
  play: () => Promise<void>;
  seekToProgress?: (progress: number) => Promise<void>; // Optional seek support
}

export interface GlobalAudioPlayerState {
  // Current track
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;

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

  // Callback for virtual tracks (played by external players)
  __virtualTrackControls?: VirtualTrackControls;
  setVirtualTrackControls: (controls: VirtualTrackControls | null) => void;
}

export type AudioPlayerGet = () => GlobalAudioPlayerState;
export type AudioPlayerSet = StoreApi<GlobalAudioPlayerState>["setState"];
