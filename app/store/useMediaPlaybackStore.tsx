import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ==================== TYPES ====================

export type MediaType = "video" | "audio";

export interface MediaState {
  isPlaying: boolean;
  isLoading: boolean;
  isMuted: boolean;
  progress: number;
  duration: number;
  hasCompleted: boolean;
  showOverlay?: boolean; // Only for videos
  error?: string;
  // Video caching fields
  isVideoLoaded?: boolean; // Track if video is loaded in memory
  loadedAt?: number; // Timestamp when video was loaded
  lastAccessedAt?: number; // Last time video was accessed
}

export interface PlaybackState {
  // Global state
  currentlyPlaying: {
    mediaKey: string | null;
    mediaType: MediaType | null;
  };

  // Media states by key
  mediaStates: Record<string, MediaState>;

  // Settings
  isAutoPlayEnabled: boolean;
  globalVolume: number;

  // Visibility tracking (for auto-play)
  currentlyVisible: string | null;
}

export interface PlaybackActions {
  // === CORE PLAYBACK ACTIONS ===

  /** Play a specific media item globally (pauses all others) */
  playMedia: (mediaKey: string, mediaType: MediaType) => void;

  /** Pause a specific media item */
  pauseMedia: (mediaKey: string) => void;

  /** Pause all media */
  pauseAllMedia: () => void;

  /** Toggle play/pause for a specific media item */
  toggleMedia: (mediaKey: string, mediaType: MediaType) => void;

  // === STATE MANAGEMENT ===

  /** Update media state properties */
  updateMediaState: (mediaKey: string, updates: Partial<MediaState>) => void;

  /** Set loading state */
  setLoading: (mediaKey: string, isLoading: boolean) => void;

  /** Set error state */
  setError: (mediaKey: string, error: string | null) => void;

  /** Set progress */
  setProgress: (mediaKey: string, progress: number) => void;

  /** Set duration */
  setDuration: (mediaKey: string, duration: number) => void;

  /** Mark as completed */
  setCompleted: (mediaKey: string, completed: boolean) => void;

  /** Toggle mute */
  toggleMute: (mediaKey: string) => void;

  /** Set overlay visibility (video only) */
  setOverlay: (mediaKey: string, visible: boolean) => void;

  // === GLOBAL CONTROLS ===

  /** Enable/disable auto-play */
  setAutoPlay: (enabled: boolean) => void;

  /** Set global volume */
  setGlobalVolume: (volume: number) => void;

  /** Handle visibility changes for auto-play */
  handleVisibilityChange: (mediaKey: string | null) => void;

  // === VIDEO CACHING ACTIONS ===

  /** Mark video as loaded in memory */
  setVideoLoaded: (mediaKey: string, loaded: boolean) => void;

  /** Update last accessed time for cache management */
  updateLastAccessed: (mediaKey: string) => void;

  /** Clean up old videos from cache (keeps recently accessed) */
  cleanupVideoCache: () => void;

  /** Get video cache status */
  getVideoCacheStatus: (mediaKey: string) => {
    isLoaded: boolean;
    lastAccessed: number | null;
    loadedAt: number | null;
  };

  /** Clean up all media states */
  cleanup: () => void;
}

// ==================== STORE ====================

type MediaPlaybackStore = PlaybackState & PlaybackActions;

const initialState: PlaybackState = {
  currentlyPlaying: {
    mediaKey: null,
    mediaType: null,
  },
  mediaStates: {},
  isAutoPlayEnabled: true, // Enable for manual controls to work
  globalVolume: 1.0,
  currentlyVisible: null,
};

const createInitialMediaState = (): MediaState => ({
  isPlaying: false,
  isLoading: false,
  isMuted: false,
  progress: 0,
  duration: 0,
  hasCompleted: false,
  showOverlay: true,
  error: undefined,
});

export const useMediaPlaybackStore = create<MediaPlaybackStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ==================== CORE PLAYBACK ACTIONS ====================

    playMedia: (mediaKey: string, mediaType: MediaType) => {
      console.log(`🎬 [MediaStore] Playing ${mediaType}: ${mediaKey}`);

      set((state) => {
        const currentState =
          state.mediaStates[mediaKey] || createInitialMediaState();
        const isCurrentlyPlaying = currentState.isPlaying;

        if (isCurrentlyPlaying) {
          // Already playing, pause it
          return {
            currentlyPlaying: { mediaKey: null, mediaType: null },
            mediaStates: {
              ...state.mediaStates,
              [mediaKey]: {
                ...currentState,
                isPlaying: false,
                showOverlay: mediaType === "video" ? true : undefined,
              },
            },
          };
        } else {
          // Pause all other media and play this one
          const newMediaStates = { ...state.mediaStates };

          // Pause all currently playing media
          Object.keys(newMediaStates).forEach((key) => {
            if (newMediaStates[key].isPlaying) {
              newMediaStates[key] = {
                ...newMediaStates[key],
                isPlaying: false,
                showOverlay:
                  mediaType === "video"
                    ? true
                    : newMediaStates[key].showOverlay,
              };
            }
          });

          // Play the selected media
          newMediaStates[mediaKey] = {
            ...currentState,
            isPlaying: true,
            showOverlay: mediaType === "video" ? false : undefined,
            error: undefined, // Clear any previous errors
          };

          return {
            currentlyPlaying: { mediaKey, mediaType },
            mediaStates: newMediaStates,
          };
        }
      });
    },

    pauseMedia: (mediaKey: string) => {
      console.log(`⏸️ [MediaStore] Pausing: ${mediaKey}`);

      set((state) => {
        const currentState = state.mediaStates[mediaKey];
        if (!currentState) return state;

        return {
          currentlyPlaying:
            state.currentlyPlaying.mediaKey === mediaKey
              ? { mediaKey: null, mediaType: null }
              : state.currentlyPlaying,
          mediaStates: {
            ...state.mediaStates,
            [mediaKey]: {
              ...currentState,
              isPlaying: false,
              showOverlay:
                currentState.showOverlay !== undefined ? true : undefined,
            },
          },
        };
      });
    },

    pauseAllMedia: () => {
      console.log(`⏸️ [MediaStore] Pausing all media`);

      set((state) => {
        const newMediaStates = { ...state.mediaStates };

        Object.keys(newMediaStates).forEach((key) => {
          if (newMediaStates[key].isPlaying) {
            newMediaStates[key] = {
              ...newMediaStates[key],
              isPlaying: false,
              showOverlay:
                newMediaStates[key].showOverlay !== undefined
                  ? true
                  : undefined,
            };
          }
        });

        return {
          currentlyPlaying: { mediaKey: null, mediaType: null },
          mediaStates: newMediaStates,
        };
      });
    },

    toggleMedia: (mediaKey: string, mediaType: MediaType) => {
      const state = get();
      const currentState = state.mediaStates[mediaKey];

      if (currentState?.isPlaying) {
        state.pauseMedia(mediaKey);
      } else {
        state.playMedia(mediaKey, mediaType);
      }
    },

    // ==================== STATE MANAGEMENT ====================

    updateMediaState: (mediaKey: string, updates: Partial<MediaState>) => {
      set((state) => ({
        mediaStates: {
          ...state.mediaStates,
          [mediaKey]: {
            ...(state.mediaStates[mediaKey] || createInitialMediaState()),
            ...updates,
          },
        },
      }));
    },

    setLoading: (mediaKey: string, isLoading: boolean) => {
      get().updateMediaState(mediaKey, { isLoading });
    },

    setError: (mediaKey: string, error: string | null) => {
      get().updateMediaState(mediaKey, { error: error || undefined });
    },

    setProgress: (mediaKey: string, progress: number) => {
      get().updateMediaState(mediaKey, { progress });
    },

    setDuration: (mediaKey: string, duration: number) => {
      get().updateMediaState(mediaKey, { duration });
    },

    setCompleted: (mediaKey: string, completed: boolean) => {
      get().updateMediaState(mediaKey, { hasCompleted: completed });
    },

    toggleMute: (mediaKey: string) => {
      set((state) => {
        const currentState = state.mediaStates[mediaKey];
        if (!currentState) return state;

        return {
          mediaStates: {
            ...state.mediaStates,
            [mediaKey]: {
              ...currentState,
              isMuted: !currentState.isMuted,
            },
          },
        };
      });
    },

    setOverlay: (mediaKey: string, visible: boolean) => {
      get().updateMediaState(mediaKey, { showOverlay: visible });
    },

    // ==================== GLOBAL CONTROLS ====================

    setAutoPlay: (enabled: boolean) => {
      set((state) => {
        if (!enabled) {
          // Disable auto-play and pause all media
          const newMediaStates = { ...state.mediaStates };
          Object.keys(newMediaStates).forEach((key) => {
            if (newMediaStates[key].isPlaying) {
              newMediaStates[key] = {
                ...newMediaStates[key],
                isPlaying: false,
                showOverlay:
                  newMediaStates[key].showOverlay !== undefined
                    ? true
                    : undefined,
              };
            }
          });

          return {
            isAutoPlayEnabled: false,
            currentlyPlaying: { mediaKey: null, mediaType: null },
            currentlyVisible: null,
            mediaStates: newMediaStates,
          };
        }

        return { isAutoPlayEnabled: enabled };
      });
    },

    setGlobalVolume: (volume: number) => {
      set({ globalVolume: Math.max(0, Math.min(1, volume)) });
    },

    handleVisibilityChange: (mediaKey: string | null) => {
      const state = get();

      if (!state.isAutoPlayEnabled) return;

      // Only handle visibility for videos (not audio)
      if (mediaKey === state.currentlyVisible) return;

      set({ currentlyVisible: mediaKey });

      if (!mediaKey) {
        // No media is visible, pause all
        state.pauseAllMedia();
      } else {
        // Auto-play the visible video (assume videos for visibility-based auto-play)
        state.playMedia(mediaKey, "video");
      }
    },

    // ==================== VIDEO CACHING ====================

    setVideoLoaded: (mediaKey: string, loaded: boolean) => {
      set((state) => {
        const currentState =
          state.mediaStates[mediaKey] || createInitialMediaState();
        const now = Date.now();

        return {
          mediaStates: {
            ...state.mediaStates,
            [mediaKey]: {
              ...currentState,
              isVideoLoaded: loaded,
              loadedAt: loaded ? now : undefined,
              lastAccessedAt: now,
            },
          },
        };
      });
    },

    updateLastAccessed: (mediaKey: string) => {
      set((state) => {
        const currentState = state.mediaStates[mediaKey];
        if (!currentState) return state;

        return {
          mediaStates: {
            ...state.mediaStates,
            [mediaKey]: {
              ...currentState,
              lastAccessedAt: Date.now(),
            },
          },
        };
      });
    },

    cleanupVideoCache: () => {
      set((state) => {
        const now = Date.now();
        const CACHE_RETENTION_TIME = 10 * 60 * 1000; // 10 minutes
        const MAX_CACHED_VIDEOS = 5; // Keep max 5 videos in cache

        // Get all video states sorted by last accessed time
        const videoStates = Object.entries(state.mediaStates)
          .filter(([_, mediaState]) => mediaState.isVideoLoaded)
          .sort(
            (a, b) => (b[1].lastAccessedAt || 0) - (a[1].lastAccessedAt || 0)
          );

        const newMediaStates = { ...state.mediaStates };

        // Remove old videos or excess videos
        videoStates.forEach(([mediaKey, mediaState], index) => {
          const shouldRemove =
            index >= MAX_CACHED_VIDEOS || // Too many cached videos
            (mediaState.lastAccessedAt &&
              now - mediaState.lastAccessedAt > CACHE_RETENTION_TIME); // Too old

          if (shouldRemove && !mediaState.isPlaying) {
            console.log(`🗑️ Removing video from cache: ${mediaKey}`);
            newMediaStates[mediaKey] = {
              ...mediaState,
              isVideoLoaded: false,
              loadedAt: undefined,
            };
          }
        });

        return { mediaStates: newMediaStates };
      });
    },

    getVideoCacheStatus: (mediaKey: string) => {
      const state = get();
      const mediaState = state.mediaStates[mediaKey];

      return {
        isLoaded: mediaState?.isVideoLoaded || false,
        lastAccessed: mediaState?.lastAccessedAt || null,
        loadedAt: mediaState?.loadedAt || null,
      };
    },

    cleanup: () => {
      set(initialState);
    },
  }))
);

// ==================== SELECTORS & UTILITIES ====================

/** Get media state for a specific key */
export const getMediaState = (mediaKey: string): MediaState => {
  const state = useMediaPlaybackStore.getState();
  return state.mediaStates[mediaKey] || createInitialMediaState();
};

/** Check if any media is playing */
export const isAnyMediaPlaying = (): boolean => {
  const state = useMediaPlaybackStore.getState();
  return state.currentlyPlaying.mediaKey !== null;
};

/** Get all playing media keys */
export const getPlayingMediaKeys = (): string[] => {
  const state = useMediaPlaybackStore.getState();
  return Object.keys(state.mediaStates).filter(
    (key) => state.mediaStates[key].isPlaying
  );
};

// ==================== HOOKS ====================

/** Hook to get media state for a specific key */
export const useMediaState = (mediaKey: string) => {
  return useMediaPlaybackStore(
    (state) => state.mediaStates[mediaKey] || createInitialMediaState()
  );
};

/** Hook to get currently playing media info */
export const useCurrentlyPlaying = () => {
  return useMediaPlaybackStore((state) => state.currentlyPlaying);
};

/** Hook to get global playback settings */
export const usePlaybackSettings = () => {
  return useMediaPlaybackStore((state) => ({
    isAutoPlayEnabled: state.isAutoPlayEnabled,
    globalVolume: state.globalVolume,
  }));
};

// Default export for route compatibility
export default useMediaPlaybackStore;
