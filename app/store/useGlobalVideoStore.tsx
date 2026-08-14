import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type VideoPlaybackSnapshot = {
  progress: number;
  currentMs: number;
  durationMs: number;
};

// Professional video player registry - stores refs to all active video players
type VideoPlayerRef = {
  pause: () => Promise<void>;
  play?: () => void | Promise<void>; // Optional play method for imperative control
  showOverlay: () => void;
  key: string;
  seekToPercent?: (percent: number) => void;
  getSnapshot?: () => VideoPlaybackSnapshot;
};

const videoPlayerRegistry = new Map<string, VideoPlayerRef>();

function keyMatchesContent(key: string, contentId: string): boolean {
  return key === contentId || key.endsWith(`::${contentId}`);
}

/** Snapshot from the live player (not Zustand progress, which can lag). */
export function getVideoPlaybackSnapshot(
  key: string
): VideoPlaybackSnapshot | null {
  return videoPlayerRegistry.get(key)?.getSnapshot?.() ?? null;
}

/** Map a media `_id` (comment sheet) onto the registered feed player key. */
export function resolveRegisteredVideoKey(
  contentId?: string | null
): string | null {
  const state = useGlobalVideoStore.getState();
  const hints = [
    state.currentlyPlayingVideo,
    state.currentlyVisibleVideo,
  ].filter(Boolean) as string[];

  if (contentId) {
    for (const hint of hints) {
      if (keyMatchesContent(hint, contentId)) return hint;
    }
    for (const key of videoPlayerRegistry.keys()) {
      if (keyMatchesContent(key, contentId)) return key;
    }
  }

  return hints[0] ?? null;
}

function pauseSessionAudioWhenVideoStarts() {
  try {
    const { useGlobalAudioPlayerStore } = require("./useGlobalAudioPlayerStore");
    const store = useGlobalAudioPlayerStore.getState();
    if (store.isPlaying) {
      store.pause().catch(() => {});
    }
  } catch {
    // no-op
  }
}

interface VideoPlayerState {
  // Global video state - only one video can play at a time
  currentlyPlayingVideo: string | null;
  playingVideos: Record<string, boolean>;
  showOverlay: Record<string, boolean>;
  mutedVideos: Record<string, boolean>;
  progresses: Record<string, number>;
  hasCompleted: Record<string, boolean>;

  // Auto-play state
  isAutoPlayEnabled: boolean;
  currentlyVisibleVideo: string | null;

  // Actions
  playVideo: (videoKey: string) => void;
  pauseVideo: (videoKey: string) => void;
  toggleVideo: (videoKey: string) => void;
  pauseAllVideos: () => void;
  cleanupAllVideos: () => void;
  toggleVideoMute: (videoKey: string) => void;
  setVideoProgress: (videoKey: string, progress: number) => void;
  setVideoCompleted: (videoKey: string, completed: boolean) => void;
  setOverlayVisible: (videoKey: string, visible: boolean) => void;
  seekVideo: (videoKey: string, percent: number) => void;

  // Video player registry - professional imperative control
  registerVideoPlayer: (key: string, player: VideoPlayerRef) => void;
  unregisterVideoPlayer: (key: string) => void;
  pauseAllVideosImperatively: () => void;

  // Global play function - pauses all others and plays selected video
  playVideoGlobally: (videoKey: string) => void;

  // Auto-play functions
  enableAutoPlay: () => void;
  disableAutoPlay: () => void;
  handleVideoVisibilityChange: (visibleVideoKey: string | null) => void;
}

export const useGlobalVideoStore = create<VideoPlayerState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentlyPlayingVideo: null,
    playingVideos: {},
    showOverlay: {},
    mutedVideos: {},
    progresses: {},
    hasCompleted: {},

    // Auto-play initial state (ENABLED - TikTok/Reels style instant playback)
    isAutoPlayEnabled: true,
    currentlyVisibleVideo: null,

    // Individual video actions
    playVideo: (videoKey: string) => {
      pauseSessionAudioWhenVideoStarts();

      set((state) => ({
        currentlyPlayingVideo: videoKey,
        playingVideos: { ...state.playingVideos, [videoKey]: true },
        showOverlay: { ...state.showOverlay, [videoKey]: false },
      }));
    },

    pauseVideo: (videoKey: string) => {
      // Imperatively pause the video player directly (no state waiting)
      const player = videoPlayerRegistry.get(videoKey);
      if (player) {
        player
          .pause()
          .catch((err: any) => console.warn(`Failed to pause ${videoKey}:`, err));
        player.showOverlay();
      }

      // Update state to reflect the change
      set((state) => ({
        currentlyPlayingVideo:
          state.currentlyPlayingVideo === videoKey
            ? null
            : state.currentlyPlayingVideo,
        playingVideos: { ...state.playingVideos, [videoKey]: false },
        showOverlay: { ...state.showOverlay, [videoKey]: true },
      }));
    },

    pauseAllVideos: () => {
      // Imperatively pause all video players (fire-and-forget, no await)
      videoPlayerRegistry.forEach((player) => {
        player.pause().catch(() => {});
        player.showOverlay();
      });

      set(() => ({
        currentlyPlayingVideo: null,
        playingVideos: {},
        showOverlay: {},
      }));
    },

    // Thread-safe cleanup function
    cleanupAllVideos: () => {
      set(() => ({
        currentlyPlayingVideo: null,
        playingVideos: {},
        showOverlay: {},
        mutedVideos: {},
        progresses: {},
        hasCompleted: {},
        currentlyVisibleVideo: null,
      }));
    },

    toggleVideoMute: (videoKey: string) => {
      set((state) => ({
        mutedVideos: {
          ...state.mutedVideos,
          [videoKey]: !state.mutedVideos[videoKey],
        },
      }));
    },

    setVideoProgress: (videoKey: string, progress: number) => {
      set((state) => ({
        progresses: { ...state.progresses, [videoKey]: progress },
      }));
    },

    setVideoCompleted: (videoKey: string, completed: boolean) => {
      set((state) => ({
        hasCompleted: { ...state.hasCompleted, [videoKey]: completed },
      }));
    },

    setOverlayVisible: (videoKey: string, visible: boolean) => {
      set((state) => ({
        showOverlay: { ...state.showOverlay, [videoKey]: visible },
      }));
    },

    seekVideo: (videoKey: string, percent: number) => {
      const player = videoPlayerRegistry.get(videoKey);
      player?.seekToPercent?.(Math.max(0, Math.min(1, percent)));
    },

    // Video player registry management
    registerVideoPlayer: (key: string, player: VideoPlayerRef) => {
      videoPlayerRegistry.set(key, player);
    },

    unregisterVideoPlayer: (key: string) => {
      videoPlayerRegistry.delete(key);
    },

    // Imperatively pause all videos (for use by audio manager)
    pauseAllVideosImperatively: () => {
      videoPlayerRegistry.forEach((player) => {
        player.pause().catch((err: any) => console.warn("Failed to pause video:", err));
        player.showOverlay();
      });

      // Also update state
      set((state) => {
        const newPlayingVideos: Record<string, boolean> = {};
        const newShowOverlay: Record<string, boolean> = {};

        Object.keys(state.playingVideos).forEach((key) => {
          newPlayingVideos[key] = false;
          newShowOverlay[key] = true;
        });

        return {
          currentlyPlayingVideo: null,
          playingVideos: newPlayingVideos,
          showOverlay: newShowOverlay,
        };
      });
    },

    // ✅ Global play function - INSTANT IMPERATIVE CONTROL (like TikTok)
    playVideoGlobally: (videoKey: string) => {
      pauseSessionAudioWhenVideoStarts();

      // Update state immediately (UI reacts instantly)
      set((state) => {
        const newPlayingVideos: Record<string, boolean> = {};
        const newShowOverlay: Record<string, boolean> = {};
        Object.keys(state.playingVideos).forEach((key) => {
          newPlayingVideos[key] = false;
          newShowOverlay[key] = true;
        });
        newPlayingVideos[videoKey] = true;
        newShowOverlay[videoKey] = false;
        return {
          currentlyPlayingVideo: videoKey,
          playingVideos: newPlayingVideos,
          showOverlay: newShowOverlay,
        };
      });

      // Fire-and-forget pause all other videos (no await - instant)
      videoPlayerRegistry.forEach((player, key) => {
        if (key !== videoKey) {
          player.pause().catch(() => {});
          player.showOverlay();
        }
      });

      // Play target video IMMEDIATELY (no waiting for pauses)
      const targetPlayer = videoPlayerRegistry.get(videoKey);
      if (targetPlayer?.play) {
        try {
          const playResult = targetPlayer.play();
          if (playResult instanceof Promise) {
            playResult.catch(() => {});
          }
        } catch {
          // no-op
        }
      }
    },

    // ✅ Toggle function - for cases where toggle behavior is needed
    toggleVideo: (videoKey: string) => {
      set((state) => {
        const isCurrentlyPlaying = state.playingVideos[videoKey] ?? false;

        if (isCurrentlyPlaying) {
          // If video is already playing, pause it
          return {
            currentlyPlayingVideo: null,
            playingVideos: { ...state.playingVideos, [videoKey]: false },
            showOverlay: { ...state.showOverlay, [videoKey]: true },
          };
        } else {
          pauseSessionAudioWhenVideoStarts();

          // Use the same logic as playVideoGlobally
          const newPlayingVideos: Record<string, boolean> = {};
          const newShowOverlay: Record<string, boolean> = {};

          // Pause all other videos
          Object.keys(state.playingVideos).forEach((key) => {
            newPlayingVideos[key] = false;
            newShowOverlay[key] = true;
          });

          // Play the selected video
          newPlayingVideos[videoKey] = true;
          newShowOverlay[videoKey] = false;

          return {
            currentlyPlayingVideo: videoKey,
            playingVideos: newPlayingVideos,
            showOverlay: newShowOverlay,
          };
        }
      });
    },

    // Auto-play functions
    enableAutoPlay: () => {
      set({ isAutoPlayEnabled: true });
      console.log("📱 Auto-play enabled");
    },

    disableAutoPlay: () => {
      set((state) => ({
        isAutoPlayEnabled: false,
        currentlyVisibleVideo: null,
        currentlyPlayingVideo: null,
        playingVideos: {},
        showOverlay: Object.keys(state.playingVideos).reduce(
          (acc, key) => ({
            ...acc,
            [key]: true,
          }),
          {}
        ),
      }));
      console.log("📱 Auto-play disabled, all videos paused");
    },

    handleVideoVisibilityChange: (visibleVideoKey: string | null) => {
      set((state) => {
        if (!state.isAutoPlayEnabled) {
          return state;
        }

        // If no video is visible or same video is still visible, no change needed
        if (visibleVideoKey === state.currentlyVisibleVideo) {
          return state;
        }

        console.log(
          `📱 Video visibility changed: ${state.currentlyVisibleVideo} → ${visibleVideoKey}`
        );

        if (!visibleVideoKey) {
          // No video is visible, pause all
          const newPlayingVideos: Record<string, boolean> = {};
          const newShowOverlay: Record<string, boolean> = {};

          Object.keys(state.playingVideos).forEach((key) => {
            newPlayingVideos[key] = false;
            newShowOverlay[key] = true;
          });

          return {
            ...state,
            currentlyPlayingVideo: null,
            currentlyVisibleVideo: null,
            playingVideos: newPlayingVideos,
            showOverlay: newShowOverlay,
          };
        } else {
          pauseSessionAudioWhenVideoStarts();

          const newPlayingVideos: Record<string, boolean> = {};
          const newShowOverlay: Record<string, boolean> = {};

          // Pause all other videos
          Object.keys(state.playingVideos).forEach((key) => {
            newPlayingVideos[key] = false;
            newShowOverlay[key] = true;
          });

          // Play the visible video
          newPlayingVideos[visibleVideoKey] = true;
          newShowOverlay[visibleVideoKey] = false;

          console.log(`📱 Auto-playing visible video: ${visibleVideoKey}, stopped all audio`);

          return {
            ...state,
            currentlyPlayingVideo: visibleVideoKey,
            currentlyVisibleVideo: visibleVideoKey,
            playingVideos: newPlayingVideos,
            showOverlay: newShowOverlay,
          };
        }
      });
    },
  }))
);

// Default export for route compatibility
export default function UseGlobalVideoStore() {
  return null;
}
