import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ⚠️ DEPRECATED: This store is being replaced by useMediaPlaybackStore.tsx
// Please use the unified store for new components.
// This store will be removed once all components are migrated.

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

    // Auto-play initial state (enabled for manual play functionality)
    isAutoPlayEnabled: true,
    currentlyVisibleVideo: null,

    // Individual video actions
    playVideo: (videoKey: string) => {
      set((state) => ({
        currentlyPlayingVideo: videoKey,
        playingVideos: { ...state.playingVideos, [videoKey]: true },
        showOverlay: { ...state.showOverlay, [videoKey]: false },
      }));
    },

    pauseVideo: (videoKey: string) => {
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

    // ✅ Global play function - ALWAYS plays the video (no toggle)
    playVideoGlobally: (videoKey: string) => {
      console.log("🌍 playVideoGlobally called with:", videoKey);
      set((state) => {
        // ALWAYS play the video - no toggle behavior
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

        console.log("🌍 Playing video:", videoKey);
        console.log("🌍 New playing videos:", newPlayingVideos);

        return {
          currentlyPlayingVideo: videoKey,
          playingVideos: newPlayingVideos,
          showOverlay: newShowOverlay,
        };
      });
    },

    // ✅ Toggle function - for cases where toggle behavior is needed
    toggleVideo: (videoKey: string) => {
      console.log("🔄 toggleVideo called with:", videoKey);
      set((state) => {
        const isCurrentlyPlaying = state.playingVideos[videoKey] ?? false;

        if (isCurrentlyPlaying) {
          // If video is already playing, pause it
          console.log("🔄 Toggling to pause:", videoKey);
          return {
            currentlyPlayingVideo: null,
            playingVideos: { ...state.playingVideos, [videoKey]: false },
            showOverlay: { ...state.showOverlay, [videoKey]: true },
          };
        } else {
          // If video is paused, play it
          console.log("🔄 Toggling to play:", videoKey);
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
          // A new video is visible, pause all others and play this one
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

          console.log(`📱 Auto-playing visible video: ${visibleVideoKey}`);

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
